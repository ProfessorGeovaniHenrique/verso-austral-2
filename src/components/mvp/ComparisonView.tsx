import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { D3SemanticCloud } from "./D3SemanticCloud";
import { Badge } from "@/components/ui/badge";

interface CloudNode {
  label: string;
  frequency: number;
  color: string;
  type: 'domain' | 'keyword';
  domain: string;
  tooltip: Record<string, any>;
}

interface ComparisonViewProps {
  gauchoNodes: CloudNode[];
  nordestinoNodes: CloudNode[];
  gauchoStats: CorpusStats;
  nordestinoStats: CorpusStats;
  onWordClick: (word: string, corpus: 'gaucho' | 'nordestino') => void;
  padding: number;
  spiral: 'archimedean' | 'rectangular';
  rotation: number;
  fontFamily: string;
  fontWeight: 'normal' | 'semibold' | 'bold';
  animationSpeed: number;
  showTooltips: boolean;
}

interface CorpusStats {
  totalWords: number;
  uniqueWords: number;
  avgWordLength: number;
  topDomains: Array<{ domain: string; percentage: number }>;
}

export function ComparisonView(props: ComparisonViewProps) {
  const gauchoWords = new Set(props.gauchoNodes.map(n => n.label));
  const nordestinoWords = new Set(props.nordestinoNodes.map(n => n.label));
  
  const exclusiveGaucho = [...gauchoWords].filter(w => !nordestinoWords.has(w)).length;
  const exclusiveNordestino = [...nordestinoWords].filter(w => !gauchoWords.has(w)).length;
  const shared = [...gauchoWords].filter(w => nordestinoWords.has(w)).length;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas Comparativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-600">Corpus Gaúcho</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono">{props.gauchoStats.totalWords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Únicas:</span>
                  <span className="font-mono">{props.gauchoStats.uniqueWords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exclusivas:</span>
                  <Badge variant="outline" className="bg-blue-50">{exclusiveGaucho}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 border-x px-6">
              <h4 className="font-semibold text-purple-600">Compartilhadas</h4>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">{shared}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {((shared / gauchoWords.size) * 100).toFixed(1)}% do Gaúcho<br/>
                  {((shared / nordestinoWords.size) * 100).toFixed(1)}% do Nordestino
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-orange-600">Corpus Nordestino</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono">{props.nordestinoStats.totalWords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Únicas:</span>
                  <span className="font-mono">{props.nordestinoStats.uniqueWords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exclusivas:</span>
                  <Badge variant="outline" className="bg-orange-50">{exclusiveNordestino}</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t">
            <div>
              <h5 className="text-sm font-medium mb-3">Domínios - Gaúcho</h5>
              <div className="space-y-2">
                {props.gauchoStats.topDomains.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{d.domain}</span>
                    <Badge variant="secondary">{d.percentage.toFixed(1)}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium mb-3">Domínios - Nordestino</h5>
              <div className="space-y-2">
                {props.nordestinoStats.topDomains.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{d.domain}</span>
                    <Badge variant="secondary">{d.percentage.toFixed(1)}%</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Corpus Gaúcho</CardTitle>
          </CardHeader>
          <CardContent>
            <D3SemanticCloud
              nodes={props.gauchoNodes}
              width={600}
              height={500}
              padding={props.padding}
              spiral={props.spiral}
              rotation={props.rotation}
              fontFamily={props.fontFamily}
              fontWeight={props.fontWeight}
              animationSpeed={props.animationSpeed}
              showTooltips={props.showTooltips}
              onWordClick={(word) => props.onWordClick(word, 'gaucho')}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Corpus Nordestino</CardTitle>
          </CardHeader>
          <CardContent>
            <D3SemanticCloud
              nodes={props.nordestinoNodes}
              width={600}
              height={500}
              padding={props.padding}
              spiral={props.spiral}
              rotation={props.rotation}
              fontFamily={props.fontFamily}
              fontWeight={props.fontWeight}
              animationSpeed={props.animationSpeed}
              showTooltips={props.showTooltips}
              onWordClick={(word) => props.onWordClick(word, 'nordestino')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
