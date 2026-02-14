import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

interface FolderModalProps {
 show: boolean;
 onHide: () => void;
 onSave: () => void;
 editing: boolean;
 folderName: string;
 setFolderName: (name: string) => void;
}

const FolderModal: React.FC<FolderModalProps> = ({ 
 show, onHide, onSave, editing, folderName, setFolderName 
}) => {
 return (
  <Modal show={show} onHide={onHide} centered size="sm">
   <Modal.Header closeButton className="border-0 pb-0">
    <Modal.Title className="fw-bold small text-uppercase">
     {editing ? 'Renombrar Carpeta' : 'Nueva Carpeta'}
    </Modal.Title>
   </Modal.Header>
   <Modal.Body>
    <Form.Group className="mb-3" controlId="folder-name">
     <Form.Label className="x-small fw-bold text-muted text-uppercase">Nombre de la carpeta</Form.Label>
     <Form.Control 
      id="folder-name"
      name="folderName"
      type="text" 
      placeholder="Ej: DIVISION SEGURIDAD" 
      value={folderName} 
      onChange={(e) => setFolderName(e.target.value)} 
      autoFocus 
      onKeyDown={(e) => e.key === 'Enter' && onSave()} 
     />
    </Form.Group>
    <Button variant="primary" className="w-100 fw-bold" onClick={onSave}>
     GUARDAR CAMBIOS
    </Button>
   </Modal.Body>
  </Modal>
 );
};

export default FolderModal;
