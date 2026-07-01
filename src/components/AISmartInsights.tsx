import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, HelpCircle, Gift, ShieldAlert } from 'lucide-react';
import { AISuggestion } from '../types';

interface AISmartInsightsProps {
  onRestockSelected?: (categoryOrProduct: string) => void;
}

export default function AISmartInsights({ onRestockSelected }: AISmartInsightsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Could not fetch AI insights');
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load real-time AI insights. Showing rules-based local metrics instead.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-indigo-600">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="font-semibold text-slate-950 text-sm uppercase tracking-wide">
              IT Solutions Smart Business Advisor
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Intelligent inventory restocks and category trends calculated using the Gemini AI API.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="p-2 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 bg-white border border-slate-100 rounded-2xl">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 w-12 h-12 bg-indigo-100 rounded-full animate-ping opacity-60" />
            <Sparkles className="w-8 h-8 text-indigo-600 animate-spin relative z-10" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Analyzing store catalog inventory...</p>
            <p className="text-xs text-slate-400">Gemini model is calculating stock margins and daily purchase logs</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.map((s, idx) => {
            const isHigh = s.severity === 'high';
            const isMedium = s.severity === 'medium';
            const isRestock = s.type === 'restock';
            const isTrend = s.type === 'trend';

            return (
              <div
                key={idx}
                className={`border p-5 rounded-2xl flex flex-col justify-between space-y-4 bg-white hover:shadow-md transition duration-200 relative overflow-hidden ${
                  isHigh
                    ? 'border-red-150 ring-1 ring-red-500/5'
                    : isMedium
                    ? 'border-indigo-150'
                    : 'border-slate-200'
                }`}
              >
                {/* Visual Accent ribbon */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isHigh
                      ? 'bg-red-500'
                      : isMedium
                      ? 'bg-indigo-600'
                      : 'bg-slate-400'
                  }`}
                />

                <div className="space-y-3 pt-1">
                  {/* Badge & Type indicators */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        isHigh
                          ? 'bg-red-50 text-red-600'
                          : isMedium
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.severity} PRIORITY
                    </span>

                    <span className="text-slate-400 shrink-0">
                      {isRestock ? (
                        <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
                      ) : isTrend ? (
                        <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
                      ) : (
                        <Gift className="w-4.5 h-4.5 text-slate-500" />
                      )}
                    </span>
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 text-xs tracking-tight line-clamp-1">
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed text-slate-600">
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* Optional Quick Action Restock Anchor button */}
                {s.targetCategoryOrProduct && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Target: {s.targetCategoryOrProduct}
                    </span>
                    {onRestockSelected && isRestock && (
                      <button
                        onClick={() => onRestockSelected(s.targetCategoryOrProduct || '')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1"
                      >
                        <span>Inspect Catalog</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {suggestions.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
              <HelpCircle className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs font-medium">No business recommendations found</p>
              <p className="text-[10px] text-slate-400 mt-1">Check back once sales transactions accumulate</p>
            </div>
          )}
        </div>
      )}

      {/* Strategy Advisor Guide Footer */}
      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-xs space-y-2">
        <h4 className="font-semibold text-slate-800">How Suggestions Are Synthesized</h4>
        <p className="text-slate-500 leading-relaxed">
          The advisor queries current product catalog balances and checks them against the minimum threshold rules. Essential items (marked with the essential indicator) are automatically prioritized for emergency alerts if stock levels are compromised. Category trending signals are generated from relative sales counts and gross margins compiled from checkout transactions.
        </p>
      </div>
    </div>
  );
}
