import React, { useState, useEffect } from 'react';
import { fetchUniverses, fetchUniverseMembers, createUniverse, deleteUniverse, scanUniverse, addAssetToUniverse, removeAssetFromUniverse } from '../api/universe';
import type { Universe, UniverseAsset } from '../api/universe';
import { Globe, Plus, Trash2, Search, Play, X, Loader } from 'lucide-react';

export const UniverseView: React.FC = () => {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [activeUniverseId, setActiveUniverseId] = useState<number | null>(null);
  const [activeMembers, setActiveMembers] = useState<UniverseAsset[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [newAssetSymbol, setNewAssetSymbol] = useState('');
  
  const [scanResults, setScanResults] = useState<any>(null);

  const loadUniverses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUniverses();
      setUniverses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch universes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (id: number) => {
    setIsMembersLoading(true);
    try {
      const members = await fetchUniverseMembers(id);
      setActiveMembers(members);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load members for this universe');
    } finally {
      setIsMembersLoading(false);
    }
  };

  useEffect(() => {
    loadUniverses();
  }, []);

  useEffect(() => {
    if (activeUniverseId) {
      loadMembers(activeUniverseId);
    } else {
      setActiveMembers([]);
    }
    setScanResults(null);
  }, [activeUniverseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createUniverse({
        name: newName,
        description: newDescription,
        is_public: false
      });
      setNewName('');
      setNewDescription('');
      await loadUniverses();
    } catch (err: any) {
      setError(err.message || 'Failed to create universe');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this universe?")) return;
    try {
      await deleteUniverse(id);
      if (activeUniverseId === id) setActiveUniverseId(null);
      await loadUniverses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete universe');
    }
  };

  const handleAddAsset = async (id: number, symbol: string) => {
    try {
      await addAssetToUniverse(id, symbol);
      setNewAssetSymbol('');
      await loadMembers(id);
      await loadUniverses(); // To refresh member_count
    } catch (err: any) {
      setError(err.message || 'Failed to add asset');
    }
  };

  const handleRemoveAsset = async (id: number, symbol: string) => {
    try {
      await removeAssetFromUniverse(id, symbol);
      await loadMembers(id);
      await loadUniverses();
    } catch (err: any) {
      setError(err.message || 'Failed to remove asset');
    }
  };

  const handleScan = async (id: number) => {
    setScanResults(null);
    try {
      const res = await scanUniverse(id);
      setScanResults(res);
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    }
  };

  const activeUniverse = universes.find(u => u.id === activeUniverseId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* Left Sidebar: Universe List */}
      <div className="w-full md:w-1/3 space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="text-blue-400" />
          Strategy Universes
        </h1>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <Plus size={16} /> New Universe
          </h3>
          <form onSubmit={handleCreate} className="space-y-2">
            <input 
              type="text" 
              placeholder="Name (e.g. S&P 500 Tech)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
              required
            />
            <input 
              type="text" 
              placeholder="Description" 
              value={newDescription} 
              onChange={e => setNewDescription(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
            />
            <button 
              type="submit" 
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-gray-400 py-4 flex items-center justify-center gap-2">
              <Loader className="animate-spin" size={16} /> Loading...
            </div>
          ) : universes.map(universe => (
            <div 
              key={universe.id}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                activeUniverseId === universe.id 
                  ? 'bg-blue-900/30 border-blue-500' 
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setActiveUniverseId(universe.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{universe.name}</div>
                  <div className="text-xs text-gray-400">{universe.member_count ?? 0} Assets</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(universe.id); }}
                  className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content: Universe Details & Assets */}
      <div className="w-full md:w-2/3">
        {error && (
          <div className="bg-red-900/30 text-red-400 border border-red-800 p-4 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {activeUniverse ? (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{activeUniverse.name}</h2>
                  <p className="text-gray-400 text-sm mt-1">{activeUniverse.description || 'No description'}</p>
                </div>
                <button 
                  onClick={() => handleScan(activeUniverse.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Play size={16} fill="currentColor" /> Scan Market
                </button>
              </div>
              
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Search size={16} /> Assets in Universe
                </h3>
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Add Symbol (e.g. AAPL)" 
                    value={newAssetSymbol}
                    onChange={e => setNewAssetSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newAssetSymbol) {
                        handleAddAsset(activeUniverse.id, newAssetSymbol);
                      }
                    }}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                  />
                  <button 
                    onClick={() => {
                      if(newAssetSymbol) handleAddAsset(activeUniverse.id, newAssetSymbol);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>

                {isMembersLoading ? (
                  <div className="py-8 text-center text-gray-500 text-sm">Loading members...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeMembers.map((member, idx) => (
                      <span 
                        key={idx} 
                        className="bg-gray-900 border border-gray-700 pl-3 pr-1 py-1 rounded-full text-sm font-mono flex items-center gap-2"
                      >
                        {member.symbol}
                        <button 
                          onClick={() => handleRemoveAsset(activeUniverse.id, member.symbol)}
                          className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full p-1 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {activeMembers.length === 0 && (
                      <div className="text-sm text-gray-500 w-full p-4 text-center border border-dashed border-gray-700 rounded">
                        No assets added yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {scanResults && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="font-bold mb-4">Scan Results</h3>
                <pre className="bg-gray-900 p-4 rounded text-xs text-green-400 overflow-x-auto custom-scrollbar max-h-96">
                  {JSON.stringify(scanResults, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border border-dashed border-gray-700 rounded-lg p-12 text-gray-500">
            Select or create a Universe to manage its assets and run scans.
          </div>
        )}
      </div>
    </div>
  );
};
