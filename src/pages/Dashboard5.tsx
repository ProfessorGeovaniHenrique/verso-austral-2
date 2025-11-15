import { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FogDomain } from '@/components/v3/FogDomain';
import { PlanetWord } from '@/components/v3/PlanetWord';
import { TexturePreloader } from '@/components/v3/TexturePreloader';
import { useFogPlanetData } from '@/hooks/useFogPlanetData';
import { useInteractivityStore } from '@/store/interactivityStore';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { ProsodiaType } from '@/data/types/corpus.types';
import * as THREE from 'three';
import { toast } from 'sonner';

export default function Dashboard5() {
  // Hook de dados FOG & PLANETS
  const {
    domains,
    connections,
    totalWords,
    totalOccurrences,
    filters,
    setFilters,
    resetFilters
  } = useFogPlanetData({
    initialFilters: {
      minFrequency: 2,
      maxWords: 10,
      fogIntensity: 0.7
    }
  });

  // Estado de interatividade (para uso futuro com tooltips/modals)
  const interactivity = useInteractivityStore();

  // Estados de controle de câmera
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.5);
  
  // Estado de texturas pré-carregadas
  const [preloadedTextures, setPreloadedTextures] = useState<THREE.Texture[] | null>(null);
  
  // Estado de WebGL Context
  const [webglError, setWebglError] = useState(false);

  // Estatísticas filtradas
  const stats = useMemo(() => {
    // 🔍 DEBUG: Logging para diagnóstico
    console.log('🔍 DEBUG FOG & PLANETS:');
    console.log('  📊 Total Domains:', domains.length);
    console.log('  📊 Total Words:', totalWords);
    console.log('  📊 Filtros Ativos:', filters);
    domains.forEach(domain => {
      console.log(`  🌫️ ${domain.dominio}: ${domain.palavras.length} palavras, opacity: ${domain.baseOpacity.toFixed(2)}, radius: ${domain.fogRadius.toFixed(2)}`);
    });
    
    return {
      totalDomains: domains.length,
      totalWords,
      totalOccurrences,
      totalConnections: connections.length
    };
  }, [domains, totalWords, totalOccurrences, connections.length, filters]);

  // Handler de filtro de prosódia
  const handleProsodyFilter = useCallback((prosody: ProsodiaType) => {
    const currentFilter = filters.prosodyFilter || [];
    const isActive = currentFilter.includes(prosody);

    if (isActive) {
      // Remover filtro
      const newFilter = currentFilter.filter(p => p !== prosody);
      setFilters({ prosodyFilter: newFilter.length > 0 ? newFilter : undefined });
    } else {
      // Adicionar filtro
      setFilters({ prosodyFilter: [...currentFilter, prosody] });
    }
  }, [filters.prosodyFilter, setFilters]);

  // Handler de seleção de domínio
  const handleDomainSelect = useCallback((domainId: string) => {
    if (filters.selectedDomainId === domainId) {
      setFilters({ selectedDomainId: undefined });
    } else {
      setFilters({ selectedDomainId: domainId });
    }
  }, [filters.selectedDomainId, setFilters]);
  
  // Handler de WebGL Context Lost
  const handleWebGLContextLost = useCallback((event: Event) => {
    event.preventDefault();
    console.warn('🔴 WebGL context lost. Tentando recuperar...');
    setWebglError(true);
    toast.error('Contexto WebGL perdido. Tentando recuperar...', {
      duration: 5000
    });
  }, []);
  
  // Handler de WebGL Context Restored
  const handleWebGLContextRestored = useCallback(() => {
    console.log('✅ WebGL context restaurado!');
    setWebglError(false);
    toast.success('Visualização 3D restaurada com sucesso!', {
      duration: 3000
    });
    window.location.reload(); // Recarregar para garantir estado limpo
  }, []);
  
  // Handler de texturas carregadas
  const handleTexturesLoaded = useCallback((textures: THREE.Texture[]) => {
    setPreloadedTextures(textures);
    console.log('✅ Texturas pré-carregadas:', textures.length);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard4">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                3D Cloud
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">FOG & PLANETS</h1>
              <p className="text-sm text-muted-foreground">
                Domínios como Nuvens Volumétricas · Palavras como Mini-Planetas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/50">
              Fase 4 - FOG
            </Badge>
            <Badge variant="outline">
              {stats.totalDomains} Domínios
            </Badge>
            <Badge variant="outline">
              {stats.totalWords} Palavras
            </Badge>
            {stats.totalWords < 20 && (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                ⚠️ Poucos dados - Ajuste os filtros
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas 3D */}
        <div className="flex-1 relative bg-slate-950">
          {webglError && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
              <Card className="max-w-md border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Erro de Renderização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O contexto WebGL foi perdido. Isso pode acontecer quando a GPU está sobrecarregada.
                  </p>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    Recarregar Visualização
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Canvas
            shadows
            gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => {
              // Adicionar listeners para WebGL context loss
              gl.domElement.addEventListener('webglcontextlost', handleWebGLContextLost);
              gl.domElement.addEventListener('webglcontextrestored', handleWebGLContextRestored);
            }}
          >
            <TexturePreloader onLoaded={handleTexturesLoaded}>
              {/* Câmera */}
              <PerspectiveCamera makeDefault position={[0, 5, 20]} fov={60} />
              
              {/* Controles de Órbita */}
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={autoRotate}
                autoRotateSpeed={autoRotateSpeed}
                minDistance={5}
                maxDistance={50}
                maxPolarAngle={Math.PI / 1.5}
                minPolarAngle={Math.PI / 6}
              />

              {/* Iluminação - Aumentada para melhor visibilidade dos FOGs */}
              <ambientLight intensity={0.6} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1.0}
                castShadow
              />
              <pointLight position={[-10, -10, -5]} intensity={0.6} color="#4fc3f7" />
              <pointLight position={[10, 10, 10]} intensity={0.5} color="#ab47bc" />
              {/* Luz central para iluminar os FOGs por dentro */}
              <pointLight position={[0, 0, 0]} intensity={0.8} color="#ffffff" distance={40} decay={1.8} />

              {/* Background: Estrelas */}
              <Stars
                radius={100}
                depth={50}
                count={3000}
                factor={4}
                saturation={0}
                fade
                speed={0.5}
              />

              {/* Renderizar FOG Domains */}
              {domains.map(domain => (
                <FogDomain
                  key={domain.dominio}
                  domain={domain}
                  opacity={filters.selectedDomainId && filters.selectedDomainId !== domain.dominio ? 0.15 : 1.0}
                />
              ))}

              {/* Renderizar Planet Words */}
              {domains.flatMap(domain => {
                const isInSelectedDomain = !filters.selectedDomainId || filters.selectedDomainId === domain.dominio;
                const wordOpacity = isInSelectedDomain ? 1.0 : 0.2;

                return domain.palavras.map(word => {
                  // Mapear textureIndex para textura pré-carregada
                  const textureIndex = parseInt(word.planetTexture.match(/planet-(\d+)/)?.[1] || '1') - 1;
                  const preloadedTexture = preloadedTextures?.[textureIndex];
                  
                  return (
                    <PlanetWord
                      key={`${domain.dominio}-${word.palavra}`}
                      word={word}
                      domainColor={domain.cor}
                      domainPosition={domain.position}
                      opacity={wordOpacity}
                      isInSelectedDomain={isInSelectedDomain}
                      preloadedTexture={preloadedTexture}
                    />
                  );
                });
              })}
            </TexturePreloader>
          </Canvas>

          {/* Overlay: Info */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-4 border border-border/50 max-w-xs">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Clique e arraste</strong> para rotacionar</p>
                <p><strong className="text-foreground">Scroll</strong> para zoom</p>
                <p><strong className="text-foreground">Passe o mouse</strong> sobre palavras</p>
              </div>
            </div>
          </div>

          {/* Overlay: Estatísticas */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-4 border border-border/50">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Domínios</p>
                <p className="text-lg font-bold text-foreground">{stats.totalDomains}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Palavras</p>
                <p className="text-lg font-bold text-foreground">{stats.totalWords}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ocorrências</p>
                <p className="text-lg font-bold text-foreground">{stats.totalOccurrences}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Conexões</p>
                <p className="text-lg font-bold text-foreground">{stats.totalConnections}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Controle */}
        <div className="w-80 bg-card/95 backdrop-blur-sm border-l border-border/50 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Seção: Câmera */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Câmera
              </h3>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="autoRotate" className="text-sm">Auto-rotação</Label>
                <Switch
                  id="autoRotate"
                  checked={autoRotate}
                  onCheckedChange={setAutoRotate}
                />
              </div>

              {autoRotate && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Velocidade: {autoRotateSpeed.toFixed(1)}
                  </Label>
                  <Slider
                    value={[autoRotateSpeed]}
                    onValueChange={([v]) => setAutoRotateSpeed(v)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Seção: Filtros de Visualização */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Filtros
              </h3>

              {/* Intensidade do FOG */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Intensidade FOG: {(filters.fogIntensity * 100).toFixed(0)}%
                </Label>
                <Slider
                  value={[filters.fogIntensity]}
                  onValueChange={([v]) => setFilters({ fogIntensity: v })}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  className="w-full"
                />
              </div>

              {/* Frequência Mínima */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Frequência Mínima: {filters.minFrequency}
                </Label>
                <Slider
                  value={[filters.minFrequency]}
                  onValueChange={([v]) => setFilters({ minFrequency: v })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Máximo de Palavras */}
              <div className="space-y-2">
                <Label className="text-xs">
                  Máx. Palavras por Domínio: {filters.maxWords}
                </Label>
                <Slider
                  value={[filters.maxWords]}
                  onValueChange={([v]) => setFilters({ maxWords: v })}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Labels */}
              <div className="flex items-center justify-between">
                <Label htmlFor="showLabels" className="text-sm">Mostrar Labels</Label>
                <Switch
                  id="showLabels"
                  checked={filters.showLabels}
                  onCheckedChange={(checked) => setFilters({ showLabels: checked })}
                />
              </div>
            </div>

            <Separator />

            {/* Seção: Filtro de Prosódia */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Prosódia Semântica
              </h3>

              <div className="space-y-2">
                {(['Positiva', 'Neutra', 'Negativa'] as ProsodiaType[]).map(prosody => {
                  const isActive = filters.prosodyFilter?.includes(prosody) || false;
                  const color = prosody === 'Positiva' ? 'bg-green-500' :
                               prosody === 'Negativa' ? 'bg-red-500' : 'bg-blue-500';

                  return (
                    <Button
                      key={prosody}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      className={`w-full justify-start ${isActive ? color : ''}`}
                      onClick={() => handleProsodyFilter(prosody)}
                    >
                      <div className={`w-3 h-3 rounded-full mr-2 ${color}`} />
                      {prosody}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Seção: Domínios */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Domínios Ativos
              </h3>

              <div className="space-y-2">
                {domains.map(domain => {
                  const isSelected = filters.selectedDomainId === domain.dominio;
                  
                  return (
                    <Button
                      key={domain.dominio}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start text-left truncate"
                      style={{
                        backgroundColor: isSelected ? domain.cor : undefined,
                        color: isSelected ? domain.corTexto : undefined
                      }}
                      onClick={() => handleDomainSelect(domain.dominio)}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: domain.cor }}
                      />
                      <span className="truncate">{domain.dominio}</span>
                      <span className="ml-auto text-xs opacity-70 flex-shrink-0">
                        {domain.palavras.length}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Botão Reset */}
            <Button
              variant="outline"
              className="w-full"
              onClick={resetFilters}
            >
              Resetar Filtros
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
