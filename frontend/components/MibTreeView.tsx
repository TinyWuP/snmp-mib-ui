
import React, { useState, memo } from 'react';
import { MibNode } from '../types';
import { ChevronRight, ChevronDown, FolderIcon, FilterIcon, XCircleIcon } from './Icons';
import { OID_CATEGORIES, matchCategory } from '../services/presetData';

interface TreeItemProps {
  node: MibNode;
  level: number;
  onSelect: (node: MibNode) => void;
  onToggleBasket: (node: MibNode) => void;
  selectedOid?: string;
  isInBasket: boolean;
  highlightedCategory?: string | null;
}

const TreeItem: React.FC<TreeItemProps> = memo(({ node, level, onSelect, onToggleBasket, selectedOid, isInBasket, highlightedCategory }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isSelected = selectedOid === node.oid;
  const hasChildren = node.children && node.children.length > 0;
  // 可选择条件：叶子节点 或 有syntax且不是SEQUENCE
  const isMetric = !hasChildren || (node.syntax && node.syntax.toLowerCase() !== 'sequence');

  // 分类高亮逻辑
  const nodeCategory = matchCategory(node.name, node.description);
  const isHighlighted = highlightedCategory && nodeCategory === highlightedCategory;
  const isDimmed = highlightedCategory && !isHighlighted;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1 px-3 cursor-pointer transition-all duration-75 group rounded-lg mb-0.5 ${
          isSelected ? 'bg-blue-600/10' :
          isHighlighted ? 'bg-amber-500/10 border border-amber-500/20' :
          isDimmed ? 'opacity-30' :
          'hover:bg-slate-900/50'
        }`}
        style={{ paddingLeft: `${level * 14 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        <span className="w-4 h-4 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); if (hasChildren) setIsOpen(!isOpen); }}>
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />
          ) : null}
        </span>

        {isMetric ? (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleBasket(node); }}
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${isInBasket ? 'bg-blue-600 border-blue-500' : 'border-slate-700 hover:border-blue-500'}`}
          >
            {isInBasket && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
          </div>
        ) : (
          <FolderIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-500' : 'text-slate-700'}`} />
        )}

        <span className={`text-[11px] truncate flex-1 tracking-tight ${
          isSelected ? 'text-blue-400 font-bold' :
          isHighlighted ? 'text-amber-400 font-semibold' :
          isInBasket ? 'text-slate-200' :
          'text-slate-500 group-hover:text-slate-300'
        }`}>
          {node.name}
          <span className={`ml-2 font-mono text-[9px] ${isSelected ? 'text-blue-300' : 'text-slate-600'}`}>
            {node.oid}
          </span>
        </span>
      </div>

      {isOpen && hasChildren && (
        <div className="border-l border-slate-900/50 ml-[21px]">
          {node.children.map((child, i) => (
            <TreeItem
              key={`${child.oid}-${i}`}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onToggleBasket={onToggleBasket}
              selectedOid={selectedOid}
              isInBasket={isInBasket}
              highlightedCategory={highlightedCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // 仅在关键属性变化时重绘
  return prev.selectedOid === next.selectedOid &&
         prev.isInBasket === next.isInBasket &&
         prev.highlightedCategory === next.highlightedCategory &&
         prev.node === next.node;
});

interface MibTreeViewProps {
  nodes: MibNode[];
  onSelect: (node: MibNode) => void;
  onToggleBasket: (node: MibNode) => void;
  selectedOid?: string;
  basketOids: string[];
}

const MibTreeView: React.FC<MibTreeViewProps> = memo(({ nodes, onSelect, onToggleBasket, selectedOid, basketOids }) => {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* 分类筛选按钮 */}
      <div className="px-4 py-3 border-b border-slate-900/50 bg-black/20">
        <div className="flex items-center gap-2 mb-3">
          <FilterIcon className="w-4 h-4 text-slate-600" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">智能筛选</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setHighlightedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              !highlightedCategory
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-600 hover:bg-slate-800'
            }`}
          >
            全部
          </button>
          {OID_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setHighlightedCategory(highlightedCategory === cat.id ? null : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                highlightedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-600 hover:bg-slate-800'
              }`}
              title={cat.description}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* OID 树 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-0.5 py-2 tree-container">
          {nodes.map((node, i) => (
            <TreeItem
              key={`${node.oid}-${i}`}
              node={node}
              level={0}
              onSelect={onSelect}
              onToggleBasket={onToggleBasket}
              selectedOid={selectedOid}
              isInBasket={basketOids.includes(node.oid)}
              highlightedCategory={highlightedCategory}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default MibTreeView;
