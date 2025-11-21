import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';

export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  timestamp: Date;
  type: LogType;
  message: string;
  songId?: string;
}

interface ProcessingLogProps {
  entries: LogEntry[];
  maxHeight?: string;
}

export function ProcessingLog({ entries, maxHeight = '400px' }: ProcessingLogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new entries
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.songId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || entry.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const exportLog = () => {
    const logText = entries.map(entry => 
      `[${format(entry.timestamp, 'yyyy-MM-dd HH:mm:ss')}] [${entry.type.toUpperCase()}] ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processing-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: LogType) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20';
    }
  };

  const typeCounts = {
    info: entries.filter(e => e.type === 'info').length,
    success: entries.filter(e => e.type === 'success').length,
    warning: entries.filter(e => e.type === 'warning').length,
    error: entries.filter(e => e.type === 'error').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Log de Processamento</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportLog}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge 
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTypeFilter('all')}
          >
            Todos ({entries.length})
          </Badge>
          {Object.entries(typeCounts).map(([type, count]) => (
            <Badge
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              className={`cursor-pointer ${typeFilter === type ? '' : getTypeColor(type as LogType)}`}
              onClick={() => setTypeFilter(type as LogType)}
            >
              {type} ({count})
            </Badge>
          ))}
        </div>
        
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no log..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea ref={scrollRef} style={{ height: maxHeight }}>
          <div className="space-y-2 font-mono text-xs">
            {filteredEntries.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma entrada no log
              </p>
            )}
            
            {filteredEntries.map((entry, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${getTypeColor(entry.type)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {format(entry.timestamp, 'HH:mm:ss')}
                  </span>
                  <span className="font-semibold uppercase">[{entry.type}]</span>
                  <span className="flex-1">{entry.message}</span>
                  {entry.songId && (
                    <span className="text-muted-foreground">#{entry.songId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
