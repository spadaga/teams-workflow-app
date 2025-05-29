// teams-workflows-app/App.js
import React, { useState, useEffect } from 'react';
import * as microsoftTeams from '@microsoft/teams-js';
import { fetchSAPWorkflows, approveWorkflow, rejectWorkflow } from './sapConnection';
import './App.css';

function App() {
  const [workflows, setWorkflows] = useState([]);
  const [isTeamsContext, setIsTeamsContext] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('=== SAP Bot Starting ===');


console.log('SAP_CLIENT_ID exists:', process.env.REACT_APP_SAP_CLIENT_ID);
console.log('SAP_CLIENT_SECRET exists:', process.env.REACT_APP_SAP_CLIENT_SECRET);
console.log('============================');

  // Fetch workflows from SAP
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      console.log('Initiating fetchWorkflows...');
      const workflowsData = await fetchSAPWorkflows();
      console.log('Fetched workflows data:', workflowsData);
      setWorkflows(workflowsData);
      setLoading(false);
      console.log('Workflows state updated:', workflowsData);
    } catch (err) {
      console.error('Error in fetchWorkflows:', err.message, err.stack);
      setError('Failed to fetch workflows. Please try again.');
      setLoading(false);
    }
  };

  // Handle Approve action
  const handleApprove = async (instanceId) => {
    try {
      console.log(`Initiating approval for InstanceID: ${instanceId}`);
      await approveWorkflow(instanceId);
      alert(`Workflow ${instanceId} approved successfully!`);
      console.log('Approval successful, refreshing workflows...');
      fetchWorkflows(); // Refresh the dashboard
    } catch (err) {
      console.error('Error in handleApprove:', err.message, err.stack);
      alert(err.message || 'Failed to approve workflow');
    }
  };

  // Handle Reject action
  const handleReject = async (instanceId) => {
    try {
      console.log(`Initiating rejection for InstanceID: ${instanceId}`);
      await rejectWorkflow(instanceId);
      alert(`Workflow ${instanceId} rejected successfully!`);
      console.log('Rejection successful, refreshing workflows...');
      fetchWorkflows(); // Refresh the dashboard
    } catch (err) {
      console.error('Error in handleReject:', err.message, err.stack);
      alert(err.message || 'Failed to reject workflow');
    }
  };

  useEffect(() => {
    console.log('Component mounting, initializing Microsoft Teams SDK...');
    // Initialize Microsoft Teams SDK
    microsoftTeams.app.initialize().then(() => {
      console.log('Microsoft Teams SDK initialized successfully');
      setIsTeamsContext(true);
      fetchWorkflows(); // Fetch workflows from SAP
    }).catch((err) => {
      console.warn('Microsoft Teams SDK initialization failed, running in standalone mode:', err);
      // Fallback for testing outside Teams
      setIsTeamsContext(false);
      fetchWorkflows();
    });
  }, []);

  const formatDate = (dateString) => {
    try {
      console.log(`Formatting date: ${dateString}`);
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Error formatting date:', dateString, err.message);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    console.log(`Getting status color for status: ${status}`);
    switch (status) {
      case 'READY': return '#28a745';
      case 'IN_PROGRESS': return '#ffc107';
      case 'COMPLETED': return '#6c757d';
      default: return '#17a2b8';
    }
  };

  const handleWorkflowClick = (workflow) => {
    console.log('Workflow card clicked:', workflow);
    setSelectedWorkflow(workflow);
  };

  const closeModal = () => {
    console.log('Closing modal');
    setSelectedWorkflow(null);
  };

  if (loading) {
    console.log('Rendering loading state');
    return <div>Loading workflows...</div>;
  }

  if (error) {
    console.log('Rendering error state:', error);
    return <div>{error}</div>;
  }

  console.log('Rendering main dashboard with workflows:', workflows);

  return (
    <div className="App">
      <header className="app-header">
        <h1>📋 Workflow Dashboard</h1>
        <p>{isTeamsContext ? 'Running in Microsoft Teams' : 'Standalone Mode'}</p>
      </header>

      <main className="workflow-container">
        <div className="workflow-stats">
          <div className="stat-card">
            <h3>{workflows.length}</h3>
            <p>Total Workflows</p>
          </div>
          <div className="stat-card">
            <h3>{workflows.filter(w => w.Status === 'READY').length}</h3>
            <p>Ready</p>
          </div>
          <div className="stat-card">
            <h3>{workflows.filter(w => w.Status === 'IN_PROGRESS').length}</h3>
            <p>In Progress</p>
          </div>
        </div>

        <div className="workflow-list">
          {workflows.map((workflow, index) => {
            console.log(`Rendering workflow ${index + 1}:`, workflow);
            return (
              <div 
                key={workflow.InstanceID} 
                className="workflow-card"
                onClick={() => handleWorkflowClick(workflow)}
              >
                <div className="workflow-header">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(workflow.Status) }}
                  >
                    {workflow.Status}
                  </span>
                  <span className="instance-id">#{workflow.InstanceID}</span>
                </div>
                <h3 className="workflow-title">{workflow.TaskTitle || 'Untitled'}</h3>
                <p className="workflow-creator">Created by: {workflow.CreatedByName || 'Unknown'}</p>
                <p className="workflow-date">{formatDate(workflow.CreatedOn)}</p>
                {workflow.TaskDetails && (
                  <p className="workflow-details">{workflow.TaskDetails.replace(/# \$#/g, '').trim()}</p>
                )}
                <div className="workflow-actions">
                  <button 
                    className="action-btn approve-btn" 
                    onClick={(e) => { e.stopPropagation(); handleApprove(workflow.InstanceID); }}
                  >
                    Approve
                  </button>
                  <button 
                    className="action-btn reject-btn" 
                    onClick={(e) => { e.stopPropagation(); handleReject(workflow.InstanceID); }}
                  >
                    Reject
                  </button>
                  <a 
                    href={workflow.InboxURL || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Opening Inbox URL for workflow ${workflow.InstanceID}:`, workflow.InboxURL);
                    }}
                  >
                    <button className="action-btn inbox-btn">Inbox URL</button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal for workflow details */}
      {selectedWorkflow && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedWorkflow.TaskTitle || 'Untitled'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Instance ID:</strong> {selectedWorkflow.InstanceID}</p>
              <p><strong>Status:</strong> {selectedWorkflow.Status}</p>
              <p><strong>Created By:</strong> {selectedWorkflow.CreatedByName || 'Unknown'}</p>
              <p><strong>Created On:</strong> {formatDate(selectedWorkflow.CreatedOn)}</p>
              {selectedWorkflow.TaskDetails && (
                <p><strong>Details:</strong> {selectedWorkflow.TaskDetails.replace(/# \$#/g, '').trim()}</p>
              )}
              <p><strong>Inbox URL:</strong> {selectedWorkflow.InboxURL || 'N/A'}</p>
              <div className="modal-actions">
                <button 
                  className="action-btn approve-btn" 
                  onClick={() => handleApprove(selectedWorkflow.InstanceID)}
                >
                  Approve
                </button>
                <button 
                  className="action-btn reject-btn" 
                  onClick={() => handleReject(selectedWorkflow.InstanceID)}
                >
                  Reject
                </button>
                <a 
                  href={selectedWorkflow.InboxURL || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => console.log(`Opening Inbox URL from modal for workflow ${selectedWorkflow.InstanceID}:`, selectedWorkflow.InboxURL)}
                >
                  <button className="action-btn inbox-btn">Inbox URL</button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;