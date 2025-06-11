"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const renderContent = () => {
    switch(currentPage) {
      case 'ai-playground':
        // Navigate to the full AI Playground page
        window.location.href = '/dashboard/ai-playground';
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            fontSize: '16px',
            color: '#999'
          }}>
            Redirecting to AI Playground...
          </div>
        );
      case 'llm-playground':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>LLM Playground</h2>
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '20px',
              borderRadius: '8px',
              minHeight: '400px'
            }}>
              <p>Chat interface coming soon...</p>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Logs & History</h2>
            <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
              <p>• User logged in - 2 minutes ago</p>
              <p>• Workflow created - 1 hour ago</p>
              <p>• System backup completed - 3 hours ago</p>
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Admin Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
                <h3>Total Users</h3>
                <p style={{ fontSize: '32px', color: '#0066cc', margin: '10px 0' }}>2,847</p>
                <p style={{ color: '#999' }}>Active users across all roles</p>
              </div>
              
              <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
                <h3>AI Workflows</h3>
                <p style={{ fontSize: '32px', color: '#00cc66', margin: '10px 0' }}>156</p>
                <p style={{ color: '#999' }}>Created and running workflows</p>
              </div>
              
              <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
                <h3>Data Sources</h3>
                <p style={{ fontSize: '32px', color: '#cc6600', margin: '10px 0' }}>12</p>
                <p style={{ color: '#999' }}>Connected Google Workspace APIs</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: '#333',
        padding: '20px'
      }}>
        <h2 style={{ marginBottom: '30px' }}>Academic AI</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentPage('dashboard')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: currentPage === 'dashboard' ? '#0066cc' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: '10px'
            }}
          >
            📊 Dashboard
          </button>
          
          <button
            onClick={() => setCurrentPage('ai-playground')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: currentPage === 'ai-playground' ? '#0066cc' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: '10px'
            }}
          >
            🧠 AI Playground
          </button>
          
          <button
            onClick={() => setCurrentPage('llm-playground')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: currentPage === 'llm-playground' ? '#0066cc' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: '10px'
            }}
          >
            💬 LLM Playground
          </button>
          
          <button
            onClick={() => setCurrentPage('logs')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: currentPage === 'logs' ? '#0066cc' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: '10px'
            }}
          >
            📜 Logs & History
          </button>
        </div>
        
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#cc0000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '50px'
          }}
        >
          🚪 Logout
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '30px'
      }}>
        {renderContent()}
      </div>
    </div>
  );
}