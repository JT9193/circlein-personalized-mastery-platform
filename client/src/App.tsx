import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard/Dashboard';
import { GraphView } from './pages/GraphView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/graph/:graphId" element={<GraphView />} />
    </Routes>
  );
}

export default App;
