'use client';

import { useState } from 'react';
import ListView from './ListView';
import RegisterView from './RegisterView';
import DetailView from './DetailView';

type ViewType = 'list' | 'register' | 'detail';

export default function ReplenishmentTab() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [selectedAiaNo, setSelectedAiaNo] = useState<string>('');

  const handleNewRegister = () => {
    setCurrentView('register');
  };

  const handleViewDetail = (aiaNo: string) => {
    setSelectedAiaNo(aiaNo);
    setCurrentView('detail');
  };

  const handleRunILP = () => {
    // ILP 실행 후 상세보기로 이동
    setSelectedAiaNo('MREPLDIST20260327000000012');
    setCurrentView('detail');
  };

  const handleBack = () => {
    setCurrentView('list');
  };

  return (
    <div>
      {currentView === 'list' && (
        <ListView
          onNewRegister={handleNewRegister}
          onViewDetail={handleViewDetail}
        />
      )}
      {currentView === 'register' && (
        <RegisterView
          onBack={handleBack}
          onRunILP={handleRunILP}
        />
      )}
      {currentView === 'detail' && (
        <DetailView
          aiaNo={selectedAiaNo}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
