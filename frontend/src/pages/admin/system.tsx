import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Card, Row, Col, Button, Spinner, Table, ProgressBar, Badge, Alert } from 'react-bootstrap';
import { Database, HardDrive, Cpu, Download, Trash2, RefreshCw, Save, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

const SystemStatus = () => {
  const [health, setHealth] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchHealth, 10000); // Update health every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchHealth(), fetchBackups()]);
    setLoading(false);
  };

  const fetchHealth = async () => {
    try {
      const res = await api.get('/admin/system/health');
      setHealth(res.data);
    } catch (e) { console.error('Error fetching health', e); }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get('/admin/system/backups');
      setBackups(res.data);
    } catch (e) { console.error('Error fetching backups', e); }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setError(null);
    try {
      await api.post('/admin/system/backup/create');
      await fetchBackups();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al crear backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`¿Eliminar backup ${filename}?`)) return;
    try {
      await api.delete(`/admin/system/backups/${filename}`);
      await fetchBackups();
    } catch (e) { alert('Error al eliminar'); }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !health) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <Layout title="Estado del Sistema">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="fw-bold h2 mb-1">Mantenimiento y Salud</h1>
          <p className="text-muted">Monitoreo de infraestructura y gestión de respaldos.</p>
        </div>
        <Button variant="outline-primary" onClick={fetchData} className="rounded-pill px-3">
          <RefreshCw size={18} className="me-2" /> Actualizar
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      <Row className="g-4 mb-5">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <Cpu size={20} className="me-2 text-primary" /> Recursos del Servidor
              </h5>
              
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span className="small fw-bold">Memoria RAM ({health?.memory?.percent}%)</span>
                  <span className="small text-muted">{formatBytes(health?.memory?.used)} / {formatBytes(health?.memory?.total)}</span>
                </div>
                <ProgressBar 
                  now={health?.memory?.percent} 
                  variant={health?.memory?.percent > 80 ? 'danger' : 'primary'} 
                  style={{height: '8px'}}
                />
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span className="small fw-bold">Almacenamiento ({health?.disk?.percent}%)</span>
                  <span className="small text-muted">{formatBytes(health?.disk?.used)} / {formatBytes(health?.disk?.total)}</span>
                </div>
                <ProgressBar 
                  now={health?.disk?.percent} 
                  variant={health?.disk?.percent > 90 ? 'danger' : 'success'} 
                  style={{height: '8px'}}
                />
              </div>

              <Row className="mt-4">
                <Col xs={6}>
                  <div className="p-3 bg-surface rounded-3 text-center border border-color">
                    <div className="x-small text-muted text-uppercase fw-bold">CPU Cores</div>
                    <div className="h4 mb-0 fw-black text-main">{health?.cpu_count}</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="p-3 bg-surface rounded-3 text-center border border-color">
                    <div className="x-small text-muted text-uppercase fw-bold">Carga CPU</div>
                    <div className="h4 mb-0 fw-black text-main">{health?.cpu_percent}%</div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4 d-flex flex-column">
              <h5 className="fw-bold mb-4 d-flex align-items-center">
                <Database size={20} className="me-2 text-primary" /> Respaldo de Base de Datos
              </h5>
              <p className="small mb-4 text-muted">
                Realice una copia de seguridad completa de la base de datos PostgreSQL. 
                El archivo incluirá esquemas, datos de tickets, usuarios y configuraciones.
              </p>
              
              <div className="mt-auto">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-100 fw-bold py-3 shadow-sm"
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                >
                  {creatingBackup ? (
                    <><Spinner animation="border" size="sm" className="me-2" /> PROCESANDO...</>
                  ) : (
                    <><Save size={20} className="me-2" /> GENERAR RESPALDO AHORA</>
                  )}
                </Button>
                <p className="x-small text-center mt-2 text-muted opacity-50">
                  Los backups se almacenan localmente en /root/Ticketera/backups
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h5 className="fw-bold mb-4">Últimos Respaldos Generados</h5>
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table responsive hover className="mb-0">
          <thead className="">
            <tr>
              <th className="border-0 small text-muted text-uppercase px-4">Archivo</th>
              <th className="border-0 small text-muted text-uppercase">Tamaño</th>
              <th className="border-0 small text-muted text-uppercase">Fecha</th>
              <th className="border-0 small text-muted text-uppercase text-end px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {backups.length > 0 ? backups.map((b) => (
              <tr key={b.filename} className="align-middle">
                <td className="px-4">
                  <div className="d-flex align-items-center">
                    <Database size={16} className="text-muted me-3" />
                    <span className="fw-bold small">{b.filename}</span>
                  </div>
                </td>
                <td><Badge bg="light" className="border fw-normal text-main">{formatBytes(b.size)}</Badge></td>
                <td className="small text-muted">{new Date(b.created_at).toLocaleString()}</td>
                <td className="text-end px-4">
                  <div className="d-flex justify-content-end gap-2">
                    <Button 
                      variant="link" 
                      className="p-0 text-primary" 
                      href={`/api/v1/admin/system/backups/${b.filename}/download`}
                      title="Descargar"
                    >
                      <Download size={18} />
                    </Button>
                    <Button 
                      variant="link" 
                      className="p-0 text-danger" 
                      onClick={() => handleDeleteBackup(b.filename)}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-5 text-muted">No hay respaldos disponibles</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <style jsx>{`
        .fw-black { font-weight: 900; }
        .x-small { font-size: 11px; }
        .transition-all { transition: all 0.2s ease; }
      `}</style>
    </Layout>
  );
};

export default SystemStatus;
