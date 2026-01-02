
import React, { useState, memo } from 'react';
import { MibNode } from '../types';
import { ChevronRight, ChevronDown, FolderIcon } from './Icons';

interface TreeItemProps {
  node: MibNode;
  level: number;
  onSelect: (node: MibNode) => void;
  onToggleBasket: (node: MibNode) => void;
  selectedOid?: string;
  isInBasket: boolean;
}

const TreeItem: React.FC<TreeItemProps> = memo(({ node, level, onSelect, onToggleBasket, selectedOid, isInBasket }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isSelected = selectedOid === node.oid;
  const hasChildren = node.children && node.children.length > 0;
  // 可选择条件：叶子节点 或 有syntax且不是SEQUENCE
  const isMetric = !hasChildren || (node.syntax && node.syntax.toLowerCase() !== 'sequence');

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1 px-3 cursor-pointer transition-all duration-75 group rounded-lg mb-0.5 ${isSelected ? 'bg-blue-600/10' : 'hover:bg-slate-900/50'}`}
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

        <span className={`text-[11px] truncate flex-1 tracking-tight ${isSelected ? 'text-blue-400 font-bold' : isInBasket ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`}>
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
  return (
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
        />
      ))}
    </div>
  );
});

export default MibTreeView;
