// @ts-nocheck
import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { fetchExecutorTemplates, createExecutorStrategy, type ExecutorStrategyPayload, type StrategyTemplate } from '../../api/strategy';
import { Play, Settings, Save, AlertCircle } from 'lucide-react';

// Custom Nodes for Premium Look
const TriggerNode = ({ data }: { data: any }) => (
  <div className="bg-[#1e1e1e] border border-blue-500/50 rounded-lg p-4 shadow-[0_0_15px_rgba(59,130,246,0.15)] min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Trigger</span>
    </div>
    <div className="text-white font-medium">{data.label}</div>
    <div className="text-xs text-gray-400 mt-1">{data.details}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
  </div>
);

const ConditionNode = ({ data }: { data: any }) => (
  <div className="bg-[#1e1e1e] border border-orange-500/50 rounded-lg p-4 shadow-[0_0_15px_rgba(249,115,22,0.1)] min-w-[200px]">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500" />
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Condition</span>
    </div>
    <div className="text-white font-medium">{data.label}</div>
    <div className="text-xs text-gray-400 mt-1">{data.details}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500" />
  </div>
);

const ActionNode = ({ data }: { data: any }) => (
  <div className="bg-[#1e1e1e] border border-emerald-500/50 rounded-lg p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)] min-w-[200px]">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500" />
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Action</span>
    </div>
    <div className="text-white font-medium">{data.label}</div>
    <div className="text-xs text-gray-400 mt-1">{data.details}</div>
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Live Market Ticks', details: 'NIFTY 50 Futures' },
    position: { x: 250, y: 50 },
  },
  {
    id: '2',
    type: 'condition',
    data: { label: 'RSI Crossover', details: 'RSI(14) > 70 (Overbought)' },
    position: { x: 250, y: 200 },
  },
  {
    id: '3',
    type: 'action',
    data: { label: 'Place Sell Order', details: 'Market Order, Qty: 50' },
    position: { x: 250, y: 350 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#00B852', strokeWidth: 2 } },
];

export const StrategyBuilderView: React.FC = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Side panel state
  const [showConfig, setShowConfig] = useState(false);
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  
  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [strategyName, setStrategyName] = useState('My Algo Strategy');
  const [symbol, setSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState('5m');
  const [tradeDirection, setTradeDirection] = useState<'LONG' | 'SHORT' | 'BOTH'>('BOTH');
  const [capital, setCapital] = useState(100000);

  useEffect(() => {
    fetchExecutorTemplates()
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setTemplates(res.items);
          setSelectedTemplate(res.items[0].key);
        }
      })
      .catch(console.error);
  }, []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({...params, animated: true, style: { stroke: '#fff', strokeWidth: 2 }}, eds)),
    [setEdges],
  );

  const handleDeploy = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload: ExecutorStrategyPayload = {
        strategy_name: strategyName,
        template_key: selectedTemplate || 'golden_crossover',
        symbol,
        timeframe,
        market_category: symbol.includes('-') ? 'crypto' : 'indian_derivative',
        initial_capital: capital,
        trade_direction: tradeDirection,
        execution_mode: 'PAPER',
        leverage_enabled: false,
        leverage: 1,
        trading_config: {},
      };
      
      const res = await createExecutorStrategy(payload);
      if (res.code === 1) {
        setSuccessMsg(`Strategy deployed successfully! ID: ${res.data.id}`);
        setShowConfig(false);
      } else {
        setErrorMsg(res.msg || 'Deployment failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during deployment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white rounded-lg overflow-hidden border border-gray-800/60 shadow-xl relative">
      <div className="flex flex-col flex-1 relative min-w-0">
        <div className="p-4 border-b border-gray-800/60 flex justify-between items-center bg-[#0f0f0f] z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Visual Strategy Builder
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/30 font-bold">Beta</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">Connect nodes to build logic, or deploy pre-built templates via configuration.</p>
          </div>
          <div className="space-x-3">
            <button 
              className="px-4 py-2 bg-[#1e1e1e] hover:bg-white/5 border border-gray-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
              onClick={() => setShowConfig(!showConfig)}
            >
              <Settings size={16} />
              {showConfig ? 'Hide Config' : 'Strategy Config'}
            </button>
            <button 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center gap-2"
              onClick={() => setShowConfig(true)}
            >
              <Play size={16} />
              Deploy...
            </button>
          </div>
        </div>
        
        {successMsg && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-900/90 border border-green-500 text-green-100 px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-bold text-sm">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-red-100 px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-sm">
            <AlertCircle size={18} />
            <span className="font-bold text-sm">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="ml-4 text-red-300 hover:text-white">&times;</button>
          </div>
        )}
        
        <div className="flex-1 w-full h-full relative z-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-[#0a0a0a]"
          >
            <Controls className="bg-[#1e1e1e] text-white border-gray-800 fill-white !shadow-xl" />
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'trigger') return '#3b82f6';
                if (node.type === 'condition') return '#f97316';
                if (node.type === 'action') return '#10b981';
                return '#1e1e1e';
              }}
              maskColor="rgba(10, 10, 10, 0.8)" 
              className="bg-[#1e1e1e] border border-gray-800/60 rounded-lg !shadow-xl hidden md:block"
              style={{ backgroundColor: '#0a0a0a' }}
            />
            <Background color="#1e1e1e" gap={16} size={1.5} />
          </ReactFlow>
        </div>
      </div>

      {/* Right Side Configuration Panel */}
      {showConfig && (
        <div className="w-[380px] bg-[#0f0f0f] border-l border-gray-800/60 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-gray-800/60">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Settings size={18} className="text-blue-400" />
              Strategy Configuration
            </h3>
            <p className="text-xs text-gray-400 mt-1">Configure and deploy to live or paper environment.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Strategy Name</label>
              <input 
                type="text" 
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="My Custom Algo"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Template</label>
              <select 
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors appearance-none"
              >
                {templates.map(t => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
                {templates.length === 0 && <option value="golden_crossover">Golden Crossover</option>}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Symbol</label>
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Timeframe</label>
                <select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trade Direction</label>
              <div className="grid grid-cols-3 gap-2">
                {['LONG', 'SHORT', 'BOTH'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => setTradeDirection(dir as any)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      tradeDirection === dir 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-[#1e1e1e] text-gray-400 hover:bg-white/5 border border-gray-800'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                <span>Initial Capital</span>
                <span className="text-blue-400 font-mono">₹{capital.toLocaleString()}</span>
              </label>
              <input 
                type="range" 
                min="10000" 
                max="1000000" 
                step="10000"
                value={capital}
                onChange={(e) => setCapital(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-800/60 bg-[#111]">
            <button 
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold tracking-wide uppercase rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              onClick={handleDeploy}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Start Paper Trading
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
