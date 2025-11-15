import { useMemo } from 'react';
import { dominiosData } from '@/data/mockup/dominios';
import { prosodiasMap } from '@/data/mockup/prosodias-map';
import type { ScannerPlanet, ScannerProbe } from '@/data/types/scannerVisualization.types';

/**
 * Algoritmo Fibonacci Sphere para distribuição uniforme de pontos em esfera
 * Baseado em: https://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
 */
function fibonacciSphereDistribution(numPoints: number): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * goldenRatio;

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angleIncrement * i;

    const lat = 90 - (inclination * 180) / Math.PI; // -90 a +90
    const lon = ((azimuth * 180) / Math.PI) % 360 - 180; // -180 a +180

    points.push({ lat, lon });
  }

  return points;
}

/**
 * Calcula posição 3D de um ponto na superfície da esfera
 */
function latLonToCartesian(
  lat: number,
  lon: number,
  radius: number
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Hook para converter dados semânticos em estrutura de Scanner
 */
export function useScannerData() {
  const planets = useMemo<ScannerPlanet[]>(() => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 graus
    
    return dominiosData.map((dominio, index) => {
      // Distribuição circular dos planetas no universo
      const angle = goldenAngle * index;
      const radius = 15 + index * 3;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = (Math.random() - 0.5) * 4; // Variação vertical

      // Calcular raio do planeta baseado no peso textual
      const planetRadius = 8 + (dominio.percentualTematico / 100) * 4; // 8 a 12 unidades

      // Distribuir palavras usando Fibonacci Sphere
      const numWords = dominio.palavrasComFrequencia.length;
      const distribution = fibonacciSphereDistribution(numWords);

      const probes: ScannerProbe[] = dominio.palavrasComFrequencia.map((palavra, idx) => {
        const { lat, lon } = distribution[idx];
        const surfacePosition = latLonToCartesian(lat, lon, planetRadius + 0.2);
        
        const prosody = prosodiasMap[palavra.palavra] || 'Neutra';

        return {
          id: `${dominio.dominio}-${palavra.palavra}`,
          word: palavra.palavra,
          latitude: lat,
          longitude: lon,
          frequency: palavra.ocorrencias,
          prosody,
          isScanned: false,
          surfacePosition,
        };
      });

      return {
        id: dominio.dominio,
        name: dominio.dominio,
        color: dominio.cor,
        textColor: dominio.corTexto,
        position: [x, y, z],
        radius: planetRadius,
        rotationSpeed: 0.05 + Math.random() * 0.05,
        probes,
        stats: {
          totalWords: dominio.palavras.length,
          lexicalRichness: dominio.riquezaLexical,
          dominance: dominio.comparacaoCorpus,
          normalizedFrequency: dominio.frequenciaNormalizada,
          textualWeight: dominio.percentualTematico,
        },
      };
    });
  }, []);

  return { planets };
}
