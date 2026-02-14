import React, { useState, useEffect } from 'react';
import { Form, ListGroup, InputGroup, Spinner } from 'react-bootstrap';
import { Search, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface LocationNode {
 id: string;
 name: string;
 path: string;
 parent_id: string | null;
}

interface Props {
 onSelect: (node: LocationNode) => void;
 selectedId?: string;
}

const LocationSelector: React.FC<Props> = ({ onSelect, selectedId }) => {
 const [locations, setLocations] = useState<LocationNode[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(false);
 const [expanded, setExpanded] = useState<Record<string, boolean>>({});

 useEffect(() => {
  fetchLocations();
 }, []);

 const fetchLocations = async () => {
  setLoading(true);
  try {
   const token = localStorage.getItem('access_token');
   const res = await fetch('/api/v1/locations', {
    headers: { 'Authorization': `Bearer ${token}` }
   });
   const data = await res.json();
   setLocations(data);
  } catch (err) {
   console.error('Error fetching locations:', err);
  } finally {
   setLoading(false);
  }
 };

 const filteredLocations = searchTerm 
  ? locations.filter(l => (l.path || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
  : locations;

 const toggleExpand = (id: string) => {
  setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
 };

 const renderTree = (parentId: string | null = null, level = 0) => {
  const nodes = locations.filter(l => l.parent_id === parentId);
  if (nodes.length === 0) return null;

  return (
   <div className={`ps-${level > 0 ? '3' : '0'}`}>
    {nodes.map(node => (
     <div key={node.id}>
      <div 
       className={`d-flex align-items-center py-1 px-2 rounded cursor-pointer ${selectedId === node.id ? 'bg-primary bg-opacity-10 text-primary fw-bold' : 'hover-'}`}
       style={{ cursor: 'pointer' }}
       onClick={() => onSelect(node)}
      >
       <div onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="me-2">
        {expanded[node.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
       </div>
       <Folder size={14} className="me-2 text-warning" />
       <span className="small">{node.name}</span>
      </div>
      {expanded[node.id] && renderTree(node.id, level + 1)}
     </div>
    ))}
   </div>
  );
 };

 return (
  <div className="border rounded p-2 bg-white shadow-sm" style={{ maxHeight: '300px', overflowY: 'auto' }}>
   <InputGroup size="sm" className="mb-2">
    <InputGroup.Text id="search-folder-icon"><Search size={14} /></InputGroup.Text>
    <Form.Control 
     name="location_search"
     aria-label="Buscar carpeta"
     aria-describedby="search-folder-icon"
     placeholder="Buscar carpeta..." 
     value={searchTerm}
     onChange={e => setSearchTerm(e.target.value)}
    />
   </InputGroup>
   
   {loading ? (
    <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
   ) : searchTerm ? (
    <ListGroup variant="flush">
     {filteredLocations.map(loc => (
      <ListGroup.Item 
       key={loc.id} 
       action 
       className="py-1 border-0 small"
       onClick={() => onSelect(loc)}
       active={selectedId === loc.id}
      >
       <Folder size={14} className="me-2" />
       <span className="small">{loc.path}</span>
      </ListGroup.Item>
     ))}
     {filteredLocations.length === 0 && <div className="text-center p-2 small text-muted">No se encontró la ubicación</div>}
    </ListGroup>
   ) : (
    <div className="location-tree">
     {renderTree()}
    </div>
   )}
   <style jsx>{`
    .hover-:hover { background-color: #f8f9fa; }
   `}</style>
  </div>
 );
};

export default LocationSelector;
