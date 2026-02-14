import React, { useState, useEffect, useRef } from 'react';
import { Form, InputGroup, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { Search, Ticket, Database, User, X, Command } from 'lucide-react';
import { useRouter } from 'next/router';
import api from '../lib/api';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const res = await api.get(`/search/?q=${encodeURIComponent(query)}`);
          setResults(res.data.hits || []);
          setShowResults(true);
        } catch (e) {
          console.error('Search failed:', e);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (link: string) => {
    setQuery('');
    setShowResults(false);
    router.push(link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket size={14} className="text-primary" />;
      case 'asset': return <Database size={14} className="text-success" />;
      case 'user': return <User size={14} className="text-info" />;
      default: return <Search size={14} />;
    }
  };

  return (
    <div className="global-search-container position-relative" ref={searchRef} style={{ width: '300px' }}>
      <InputGroup size="sm" className="bg-surface rounded-pill overflow-hidden border border-color shadow-sm transition-all focus-within-shadow">
        <InputGroup.Text className="bg-transparent border-0 pe-0 text-muted">
          {loading ? <Spinner animation="border" size="sm" /> : <Search size={16} />}
        </InputGroup.Text>
            <Form.Control
             id="global-search-input"
             name="global-search-input"
             aria-label="Buscador global"
             placeholder="Buscar tickets, activos..."
             className="bg-transparent border-0 shadow-none x-small fw-bold py-2"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             onFocus={() => query.length > 1 && setShowResults(true)}
            />        {query && (
          <InputGroup.Text className="bg-transparent border-0 ps-0 clickable" onClick={() => setQuery('')}>
            <X size={14} className="text-muted" />
          </InputGroup.Text>
        )}
        {!query && (
          <InputGroup.Text className="bg-transparent border-0 ps-0 text-muted opacity-50 pe-3 d-none d-md-flex">
            <Command size={12} className="me-1" /> K
          </InputGroup.Text>
        )}
      </InputGroup>

      {showResults && (
        <div className="search-results-dropdown position-absolute w-100 mt-2 shadow-2xl rounded-lg overflow-hidden z-1000 border border-color" style={{ top: '100%', left: 0, backgroundColor: 'var(--bg-card)', zIndex: 9999 }}>
          <ListGroup variant="flush">
            {results.length > 0 ? (
              results.map((hit) => (
                <ListGroup.Item 
                  key={hit.id} 
                  action 
                  className="d-flex align-items-center gap-3 py-3 border-bottom border-color clickable"
                  onClick={() => handleSelect(hit.link)}
                >
                  <div className="bg-surface p-2 rounded-circle shadow-sm">
                    {getIcon(hit.type)}
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="fw-black x-small uppercase text-truncate text-main">{hit.title}</div>
                      <Badge bg="secondary" className="bg-opacity-10 text-muted x-small" style={{ fontSize: '8px' }}>{hit.type}</Badge>
                    </div>
                    <div className="text-muted text-truncate" style={{ fontSize: '10px' }}>{hit.description}</div>
                  </div>
                </ListGroup.Item>
              ))
            ) : (
              <div className="p-4 text-center text-muted x-small fw-bold italic">
                No se encontraron resultados para "{query}"
              </div>
            )}
          </ListGroup>
        </div>
      )}

      <style jsx>{`
        .global-search-container { transition: width 0.3s ease; }
        .global-search-container:focus-within { width: 400px !important; }
        .focus-within-shadow:focus-within { box-shadow: 0 0 0 2px var(--primary-muted) !important; border-color: var(--primary) !important; }
        .search-results-dropdown { animation: slideDown 0.2s ease-out; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
