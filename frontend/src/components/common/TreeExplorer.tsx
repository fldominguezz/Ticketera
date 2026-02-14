import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, MapPin, Users } from 'lucide-react';

interface TreeNodeProps {
 node: any;
 level: number;
 type: 'groups' | 'locations';
 onSelect: (node: any) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, type, onSelect }) => {
 const [isOpen, setIsOpen] = useState(level < 1); // Expandir primer nivel por defecto
 const hasChildren = node.children && node.children.length > 0;

 const Icon = type === 'groups' ? Users : MapPin;

 return (
  <div className="tree-node" style={{ marginLeft: `${level * 16}px` }}>
   <div 
    className={`d-flex align-items-center py-2 px-3 rounded cursor-pointer tree-row ${level === 0 ? 'fw-bold' : ''}`}
    onClick={() => {
     if (hasChildren) setIsOpen(!isOpen);
     onSelect(node);
    }}
   >
    <span className="me-2 text-muted">
     {hasChildren ? (
      isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
     ) : (
      <div style={{ width: 14 }} />
     )}
    </span>
    <Icon size={16} className={`me-2 ${level === 0 ? 'text-primary' : 'text-muted opacity-75'}`} />
    <span className="x-small tracking-tight uppercase">
     {node.dependency_code && <span className="text-primary me-2">[{node.dependency_code}]</span>}
     {node.name}
    </span>
    {hasChildren && (
     <Badge bg="secondary" className="ms-auto bg-opacity-10 text-muted x-small" style={{ fontSize: '8px' }}>
      {node.children.length}
     </Badge>
    )}
   </div>
   
   {hasChildren && isOpen && (
    <div className="tree-children">
     {node.children.map((child: any) => (
      <TreeNode key={child.id} node={child} level={level + 1} type={type} onSelect={onSelect} />
     ))}
    </div>
   )}

   <style jsx>{`
    .tree-row { transition: all 0.2s ease; border: 1px solid transparent; }
    .tree-row:hover { background: rgba(13, 110, 253, 0.05); border-color: rgba(13, 110, 253, 0.1); color: var(--bs-primary); }
    .cursor-pointer { cursor: pointer; }
    .x-small { font-size: 11px; }
   `}</style>
  </div>
 );
};

export const TreeExplorer = ({ data, type, onSelect }: { data: any[], type: 'groups' | 'locations', onSelect: (node: any) => void }) => {
 return (
  <div className="tree-explorer bg-black rounded p-2 border border-opacity-5">
   {data.length > 0 ? (
    data.map(node => (
     <TreeNode key={node.id} node={node} level={0} type={type} onSelect={onSelect} />
    ))
   ) : (
    <div className="p-4 text-center text-muted x-small uppercase fw-bold">No hay registros definidos</div>
   )}
  </div>
 );
};

import { Badge } from 'react-bootstrap';
