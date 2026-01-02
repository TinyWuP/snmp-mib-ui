
import { MibNode } from '../types';

/**
 * 极致兼容性 MIB 解析器 - 增强版
 */
export const parseMibContent = (text: string, fileName: string): MibNode[] => {
  const nodes: Map<string, MibNode> = new Map();
  // 预处理：移除注释，统一换行符，处理 IMPORTS 等干扰项
  const cleanText = text.replace(/--.*$/gm, '').replace(/\r\n/g, '\n');

  // 模块名提取 (不区分大小写)
  const moduleMatch = cleanText.match(/(\S+)\s+DEFINITIONS\s+::=\s+BEGIN/i);
  const moduleName = moduleMatch ? moduleMatch[1] : fileName.replace(/\.[^/.]+$/, "");

  // 1. 尝试解析 OBJECT-TYPE (核心指标)
  const objectTypeBlocks = cleanText.split(/OBJECT-TYPE/gi);
  objectTypeBlocks.forEach((block, index) => {
    if (index === 0) return;
    const prevBlock = objectTypeBlocks[index - 1];
    const nameMatch = prevBlock.match(/(\w+)\s*$/);
    if (!nameMatch) return;
    
    const name = nameMatch[1];
    const oidMatch = block.match(/::=\s*{\s*([^}]+)\s*}/);
    if (!oidMatch) return;

    const oidParts = oidMatch[1].trim().split(/\s+/);
    const parent = oidParts[0];
    const subIndex = oidParts.slice(1).join('.');

    nodes.set(name, {
      name,
      oid: subIndex ? `${parent}.${subIndex}` : parent,
      parentOid: parent,
      syntax: block.match(/SYNTAX\s+([^M\n\r]+)/i)?.[1]?.trim(),
      access: block.match(/(?:MAX-ACCESS|ACCESS)\s+(\S+)/i)?.[1],
      status: block.match(/STATUS\s+(\S+)/i)?.[1],
      description: block.match(/DESCRIPTION\s+"([\s\S]*?)"/i)?.[1]?.trim(),
      children: []
    });
  });

  // 2. 解析 OBJECT IDENTIFIER (节点结构)
  const idRegex = /(\w+)\s+OBJECT\s+IDENTIFIER\s+::=\s*{\s*([^}]+)\s*}/gi;
  let idMatch;
  while ((idMatch = idRegex.exec(cleanText)) !== null) {
    const name = idMatch[1];
    const pathParts = idMatch[2].trim().split(/\s+/);
    const parent = pathParts[0];
    const subIndex = pathParts.slice(1).join('.');
    if (!nodes.has(name)) {
      nodes.set(name, { name, oid: subIndex ? `${parent}.${subIndex}` : parent, parentOid: parent, children: [] });
    }
  }

  // 3. 构建层级树
  const rootNodes: MibNode[] = [];
  const nodeArray = Array.from(nodes.values());
  
  if (nodeArray.length === 0) {
     // 兜底：如果没解析出标准节点，至少返回一个根
     return [{ name: `${moduleName} (No Nodes Found)`, oid: "1.3.6.1", children: [] }];
  }

  nodeArray.forEach(node => {
    const parentNode = nodes.get(node.parentOid || '');
    if (parentNode && parentNode !== node) {
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes.length > 0 ? rootNodes : nodeArray.slice(0, 1);
};

export const extractHighValueNodes = (nodes: MibNode[]): MibNode[] => {
  const highValueNodes: MibNode[] = [];
  const keywords = ['usage', 'cpu', 'memory', 'temp', 'load', 'status', 'traffic', 'octets', 'error', 'fan', 'power', 'storage'];
  
  const traverse = (nodeList: MibNode[]) => {
    nodeList.forEach(node => {
      const isMetric = node.syntax && !node.syntax.toLowerCase().includes('sequence');
      const matchesKeyword = keywords.some(k => 
        node.name.toLowerCase().includes(k) || 
        (node.description && node.description.toLowerCase().includes(k))
      );

      if (isMetric && matchesKeyword) highValueNodes.push(node);
      if (node.children) traverse(node.children);
    });
  };

  traverse(nodes);
  return highValueNodes.slice(0, 20);
};
