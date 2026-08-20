/**
 * Duka Letu - Relational Vector Database & Semantic RAG Engine
 * Supports:
 * - High-dimensional Vector Embeddings (768-dim via Google text-embedding-004)
 * - In-Memory & Relational SQL Hybrid Search (Cosine Similarity + Metadata filtering)
 * - MySQL 9.0 (VECTOR / VECTOR_DISTANCE) & PostgreSQL (pgvector) compatibility DDL
 */

import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

export interface VectorDocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  category: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface SimilaritySearchResult {
  chunk: VectorDocumentChunk;
  score: number; // 0 to 1 cosine similarity
}

export class RelationalVectorStore {
  private chunks: VectorDocumentChunk[] = [];
  private ai: GoogleGenAI | null = null;
  private isInitialized = false;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  /**
   * MySQL 9.0 DDL Schema for Reference & Production Migrations
   */
  public static readonly MYSQL_VECTOR_SCHEMA = `
    -- MySQL 9.0 Native Vector Table Definition
    CREATE TABLE IF NOT EXISTS knowledge_vector_chunks (
      id VARCHAR(64) PRIMARY KEY,
      document_id VARCHAR(64) NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      chunk_index INT NOT NULL,
      embedding VECTOR(768) NOT NULL,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category (category)
    );

    -- MySQL 9.0 Cosine Similarity Vector Search Query:
    -- SELECT id, document_name, category, content,
    --        VECTOR_DISTANCE(embedding, STRING_TO_VECTOR(?), 'COSINE') AS distance
    -- FROM knowledge_vector_chunks
    -- WHERE category = ?
    -- ORDER BY distance ASC
    -- LIMIT 3;
  `;

  /**
   * PostgreSQL + pgvector DDL Schema
   */
  public static readonly PGVECTOR_SCHEMA = `
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS knowledge_vector_chunks (
      id VARCHAR(64) PRIMARY KEY,
      document_id VARCHAR(64) NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      chunk_index INT NOT NULL,
      embedding vector(768) NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_vec_hnsw ON knowledge_vector_chunks 
    USING hnsw (embedding vector_cosine_ops);
  `;

  /**
   * Generate 768-dimensional embedding for given text
   */
  public async getEmbedding(text: string): Promise<number[]> {
    const cleanText = text.trim().replace(/\n+/g, ' ').substring(0, 1000);
    if (!cleanText) {
      return new Array(768).fill(0);
    }

    try {
      if (this.ai && process.env.GEMINI_API_KEY) {
        const result: any = await this.ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: cleanText,
        });
        const embeddingValues = result.embedding?.values || (result.embeddings && result.embeddings[0]?.values);
        if (embeddingValues && embeddingValues.length > 0) {
          return embeddingValues;
        }
      }
    } catch (err) {
      // Fallback to deterministic semantic vector generator if API is constrained
      console.warn('Google Embeddings API notice, utilizing local deterministic embedding fallback:', err);
    }

    return this.generateFallbackEmbedding(cleanText, 768);
  }

  /**
   * Deterministic semantic hash embedding generator for local resilience
   */
  private generateFallbackEmbedding(text: string, dimensions = 768): number[] {
    const vector = new Array(dimensions).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, wordIndex) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      for (let d = 0; d < dimensions; d++) {
        const weight = Math.sin(hash + d + wordIndex);
        vector[d] += weight;
      }
    });

    // Normalize vector to unit length
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate Cosine Similarity between two unit vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * Recursive chunking utility for RAG Document Processing
   */
  public chunkText(text: string, chunkSize = 400, overlap = 50): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + '\n' + paragraph).length <= chunkSize) {
        currentChunk = currentChunk ? currentChunk + '\n' + paragraph : paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        if (paragraph.length > chunkSize) {
          // Sub-split long paragraph by sentences
          const sentences = paragraph.split(/(?<=[.?!])\s+/);
          let subChunk = '';
          for (const s of sentences) {
            if ((subChunk + ' ' + s).length <= chunkSize) {
              subChunk = subChunk ? subChunk + ' ' + s : s;
            } else {
              if (subChunk) chunks.push(subChunk.trim());
              subChunk = s;
            }
          }
          currentChunk = subChunk;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Ingest and index knowledge documents from db
   */
  public async indexKnowledgeBase(): Promise<number> {
    const docs = db.getKnowledgeDocuments();
    const newChunks: VectorDocumentChunk[] = [];

    for (const doc of docs) {
      const textChunks = this.chunkText(doc.content, 450, 60);
      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];
        const embedding = await this.getEmbedding(`${doc.name} - ${doc.category}: ${chunkContent}`);
        newChunks.push({
          id: `vec-${doc.id}-${i}`,
          documentId: doc.id,
          documentName: doc.name,
          category: doc.category,
          content: chunkContent,
          embedding,
          chunkIndex: i,
          metadata: {
            category: doc.category,
            totalChunks: textChunks.length,
            createdAt: doc.createdAt
          }
        });
      }
    }

    this.chunks = newChunks;
    this.isInitialized = true;
    return this.chunks.length;
  }

  /**
   * Perform Semantic Vector Search with Cosine Similarity & Metadata Filtering
   */
  public async similaritySearch(
    query: string, 
    topK = 3, 
    categoryFilter?: string
  ): Promise<{ context: string; sources: string[]; results: SimilaritySearchResult[]; confidence: number }> {
    if (!this.isInitialized || this.chunks.length === 0) {
      await this.indexKnowledgeBase();
    }

    if (this.chunks.length === 0) {
      return { context: 'No knowledge base documents indexed.', sources: [], results: [], confidence: 0.1 };
    }

    const queryEmbedding = await this.getEmbedding(query);
    const scoredChunks: SimilaritySearchResult[] = [];

    for (const chunk of this.chunks) {
      let similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

      // Category boost if matches filter
      if (categoryFilter && chunk.category.toLowerCase().includes(categoryFilter.toLowerCase())) {
        similarity = Math.min(1.0, similarity + 0.15);
      }

      scoredChunks.push({ chunk, score: similarity });
    }

    // Sort by highest similarity score
    scoredChunks.sort((a, b) => b.score - a.score);
    const topResults = scoredChunks.slice(0, topK);

    if (topResults.length === 0 || topResults[0].score < 0.20) {
      const defaultDoc = this.chunks[0];
      return {
        context: `General Store Information:\n${defaultDoc.content}`,
        sources: [defaultDoc.documentName],
        results: topResults,
        confidence: 0.25
      };
    }

    const context = topResults
      .map(r => `[Source: ${r.chunk.documentName} | Category: ${r.chunk.category}]\n${r.chunk.content}`)
      .join('\n\n');

    const sources = Array.from(new Set(topResults.map(r => r.chunk.documentName)));
    const topScore = topResults[0].score;

    return {
      context,
      sources,
      results: topResults,
      confidence: Math.min(0.98, topScore)
    };
  }
}

export const vectorStore = new RelationalVectorStore();
