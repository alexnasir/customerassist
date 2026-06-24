import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Layers, 
  Award, 
  CheckCircle,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { KnowledgeDocument } from '../types.js';

export default function KnowledgeBaseView() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // New document form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Refunds & Returns');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  // Similarity Search simulation state
  const [testQuery, setTestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ doc: KnowledgeDocument; score: number }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !content || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, content })
      });
      if (res.ok) {
        setShowAddDoc(false);
        setName('');
        setContent('');
        loadDocuments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadDocuments();
        setSearchResults([]);
        setHasSearched(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Local Semantic Simulator matching the server's retrieval scoring
  const handleTestSearch = () => {
    if (!testQuery.trim() || documents.length === 0) return;

    const queryWords = testQuery.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const scored = documents.map(doc => {
      let score = 0;
      const text = (doc.name + ' ' + doc.content + ' ' + doc.category).toLowerCase();
      queryWords.forEach(word => {
        if (text.includes(word)) {
          score += 15; // default find base
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          const matches = text.match(regex);
          if (matches) {
            score += matches.length * 10;
          }
        }
      });
      return { doc, score };
    });

    const filtered = scored.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    setSearchResults(filtered);
    setHasSearched(true);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090D16]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#090D16] p-8 overflow-y-auto flex flex-col xl:flex-row gap-8" id="knowledge-base-view">
      
      {/* LEFT COLUMN: Documents Index */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-5">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              Knowledge Base Management
            </h2>
            <p className="text-sm text-gray-400 mt-1">Upload unstructured documents (FAQs, return rules) to populate your Retrieval-Augmented Generation context.</p>
          </div>
          <button
            onClick={() => setShowAddDoc(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-all duration-150"
          >
            Add Document
          </button>
        </div>

        {/* List of documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-2xl relative group shadow-lg">
              <button
                onClick={() => handleDeleteDoc(doc.id)}
                className="absolute top-4 right-4 p-1.5 bg-rose-950/20 text-rose-400 hover:text-white hover:bg-rose-950 border border-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
                title="Delete Document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-950/40 text-cyan-400 rounded-xl border border-cyan-800/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                    {doc.category}
                  </span>
                  <h4 className="font-bold text-white text-base mt-2 truncate pr-6">{doc.name}</h4>
                </div>
              </div>

              {/* Text content summary */}
              <p className="text-xs text-gray-400 mt-4 line-clamp-3 leading-relaxed border-b border-[#1E293B] pb-4">
                {doc.content}
              </p>

              {/* Chunk Count */}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Chunks: <strong className="text-white">{doc.chunkCount} blocks</strong>
                </span>
                <span>ID: {doc.id}</span>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="col-span-full bg-[#0F172A] border border-dashed border-[#1E293B] rounded-2xl p-12 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto text-gray-600 mb-3" />
              <p className="text-sm font-semibold">Your Knowledge Base index is empty</p>
              <p className="text-xs text-gray-400 mt-1">Upload Return Rules, Shipping FAQs, or product specs to populate context.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: RAG Semantic Simulator */}
      <div className="w-full xl:w-96 shrink-0 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 h-fit">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Search className="w-4 h-4 text-cyan-400" />
          RAG Retrieval Simulator
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">Test how the Gemini engine parses and scores documents during an active customer chat request.</p>

        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="e.g. Standard shipping rates"
              className="w-full bg-[#090D16] border border-[#1E293B] focus:border-cyan-400 rounded-xl pl-4 pr-10 py-3 text-xs text-white outline-none transition-all duration-150"
            />
            <button
              onClick={handleTestSearch}
              className="absolute right-2 top-2 p-1.5 bg-cyan-600 text-white hover:bg-cyan-500 rounded-lg transition-all duration-150"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5 pt-2">
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Similarity Search Rankings</h4>
            
            {hasSearched ? (
              searchResults.length > 0 ? (
                searchResults.map(({ doc, score }, index) => (
                  <div key={doc.id} className="bg-[#090D16] border border-[#1E293B] p-4 rounded-xl relative">
                    <div className="absolute right-3 top-3 bg-cyan-950 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded">
                      Score: {score}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-white font-bold truncate pr-16">{doc.name}</span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">
                      {doc.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="bg-[#090D16] p-4 rounded-xl text-center text-xs text-rose-400 font-medium">
                  No documents contain keyword overlap.
                </div>
              )
            ) : (
              <div className="bg-[#090D16] p-6 rounded-xl text-center text-xs text-gray-500 italic border border-dashed border-[#1E293B]/40">
                Enter a search query to simulate document retrieval rankings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Upload Knowledge Document */}
      {showAddDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddDocument} className="bg-[#0F172A] border border-[#1E293B] p-6 rounded-2xl w-full max-w-xl shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-lg">Add Knowledge Document</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Return Policy Addendum.txt"
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Inquiry Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 font-semibold"
                >
                  <option value="Refunds & Returns">Refunds & Returns</option>
                  <option value="Shipping & Delivery">Shipping & Delivery</option>
                  <option value="Order Status & Tracking">Order Status & Tracking</option>
                  <option value="General FAQs">General FAQs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Unstructured Knowledge Content</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste FAQ lists, policies, return rules, or product datasheets here..."
                className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 h-44 resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDoc(false)}
                className="bg-[#1E293B] hover:bg-[#334155] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md disabled:opacity-45"
              >
                {creating ? 'Analyzing Text Chunks...' : 'Ingest Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
