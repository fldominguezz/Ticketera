import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container, Table, Button, Badge, Card } from 'react-bootstrap';
import { Plus, Edit, FileText, Trash } from 'lucide-react';
import Link from 'next/link';
import Layout from '../../../components/Layout';

export default function AdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    } else {
      fetchForms(token);
    }
  }, [router]);

  const fetchForms = async (token: string) => {
    try {
      const res = await fetch('/api/v1/forms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setForms(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Manage Forms">
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-0">Custom Forms</h1>
            <p className="text-muted">Manage dynamic forms and automation rules</p>
          </div>
          <Link href="/admin/forms/builder" passHref>
            <Button variant="primary" className="d-flex align-items-center px-4">
              <Plus size={18} className="me-2" /> Create New Form
            </Button>
          </Link>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Form Name</th>
                  <th>Group</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.length > 0 ? forms?.map((f: any) => (
                  <tr key={f.id} className="align-middle">
                    <td className="ps-4 fw-bold">
                      <FileText size={16} className="me-2 text-primary" />
                      {f.name}
                    </td>
                    <td>{f.group_id.substring(0, 8)}</td>
                    <td>
                      <Badge bg="info" pill>{f.schema?.fields?.length || 0} fields</Badge>
                    </td>
                    <td>
                      <Badge bg={f.is_active ? 'success' : 'secondary'}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Button variant="outline-secondary" size="sm" className="me-2 border-0">
                        <Edit size={16} />
                      </Button>
                      <Button variant="outline-danger" size="sm" className="border-0">
                        <Trash size={16} />
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      {loading ? 'Loading...' : 'No forms found. Create your first one!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
}
