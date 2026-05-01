"use client";

import { useState } from "react";
import Link from "next/link";
import { mockKBArticles, KBArticle } from "@/lib/mockData";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-900/40 text-green-400 border-green-800",
  medium: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  high: "bg-red-900/40 text-red-400 border-red-800",
};

const ALL_CATEGORIES = ["All", ...Array.from(new Set(mockKBArticles.map((a) => a.category)))];

export default function KBPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [expanded, setExpanded] = useState<KBArticle | null>(null);

  const filtered = mockKBArticles.filter((a) => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.includes(search.toLowerCase()));
    const matchCat = category === "All" || a.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/techops" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Back to TechOps
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-1">{mockKBArticles.length} articles</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111827] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-[#111827] border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">No articles match your search.</div>
        )}
        {filtered.map((article) => (
          <div key={article.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm leading-snug">{article.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{article.category} · {article.subcategory}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${RISK_COLORS[article.risk]}`}>
                  {article.risk} risk
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{article.summary}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {article.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">👍 {article.helpful_count} helpful · {article.created_at}</span>
                <button
                  onClick={() => setExpanded(expanded?.id === article.id ? null : article)}
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                >
                  {expanded?.id === article.id ? "Collapse ↑" : "Read Article ↓"}
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expanded?.id === article.id && (
              <div className="border-t border-gray-800 px-5 py-5 bg-[#0f1117]">
                <div className="prose-sm text-gray-300 leading-relaxed">
                  {article.content.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) {
                      return (
                        <p key={i} className="text-white font-semibold text-sm mt-4 mb-1 first:mt-0">
                          {line.replace("## ", "")}
                        </p>
                      );
                    }
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                      return (
                        <p key={i} className="text-gray-400 text-xs pl-3 before:content-['•'] before:mr-2 before:text-gray-600">
                          {line.replace(/^[-*] /, "")}
                        </p>
                      );
                    }
                    if (/^\d+\. /.test(line)) {
                      return (
                        <p key={i} className="text-gray-400 text-xs pl-3">
                          {line}
                        </p>
                      );
                    }
                    if (line === "") return <div key={i} className="h-2" />;
                    return (
                      <p key={i} className="text-gray-400 text-xs">{line}</p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
