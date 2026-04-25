'use client';

import { useState } from 'react';
import { EmailList } from '@/components/EmailList';
import { EmailDetail } from '@/components/EmailDetail';

export default function SentPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDeleted = (id: number) => {
    if (selectedId === id) setSelectedId(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-[400px] flex-shrink-0 h-full">
        <EmailList
          key={refreshKey}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          folder="sent"
        />
      </div>
      <div className="flex-1 h-full min-w-0">
        <EmailDetail selectedId={selectedId} onDeleted={handleDeleted} />
      </div>
    </div>
  );
}
