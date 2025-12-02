import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Music, Calendar, FileX, TrendingDown } from 'lucide-react';

interface DataQualityAlertsProps {
  dataQuality: {
    suspiciousComposers: number;
    invalidYears: number;
    missingMultipleFields: number;
    lowConfidence: number;
  };
  totalSongs: number;
}

export function DataQualityAlerts({ dataQuality, totalSongs }: DataQualityAlertsProps) {
  const totalIssues = 
    dataQuality.suspiciousComposers +
    dataQuality.invalidYears +
    dataQuality.missingMultipleFields +
    dataQuality.lowConfidence;

  const hasIssues = totalIssues > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualidade de Dados</CardTitle>
        <CardDescription>
          Problemas detectados no enriquecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasIssues ? (
          <Alert className="border-green-500/20 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Qualidade Excelente</AlertTitle>
            <AlertDescription className="text-green-500/80">
              Nenhum problema detectado nos dados enriquecidos!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {dataQuality.suspiciousComposers > 0 && (
              <Alert variant="destructive" className="border-orange-500/20 bg-orange-500/10">
                <Music className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500">Compositores Suspeitos</AlertTitle>
                <AlertDescription className="text-orange-500/80">
                  {dataQuality.suspiciousComposers} músicas com compositor igual ao artista ou com dados inválidos (
                  {((dataQuality.suspiciousComposers / totalSongs) * 100).toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}

            {dataQuality.invalidYears > 0 && (
              <Alert variant="destructive" className="border-orange-500/20 bg-orange-500/10">
                <Calendar className="h-4 w-4 text-orange-500" />
                <AlertTitle className="text-orange-500">Anos Inválidos</AlertTitle>
                <AlertDescription className="text-orange-500/80">
                  {dataQuality.invalidYears} músicas com ano de lançamento inválido (&lt;1900 ou &gt;{new Date().getFullYear()}) (
                  {((dataQuality.invalidYears / totalSongs) * 100).toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}

            {dataQuality.missingMultipleFields > 0 && (
              <Alert variant="destructive" className="border-yellow-500/20 bg-yellow-500/10">
                <FileX className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">Múltiplos Campos Faltando</AlertTitle>
                <AlertDescription className="text-yellow-500/80">
                  {dataQuality.missingMultipleFields} músicas com 2+ campos essenciais faltando (
                  {((dataQuality.missingMultipleFields / totalSongs) * 100).toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}

            {dataQuality.lowConfidence > 0 && (
              <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-red-500">Baixa Confiança</AlertTitle>
                <AlertDescription className="text-red-500/80">
                  {dataQuality.lowConfidence} músicas com score de confiança abaixo de 50% (
                  {((dataQuality.lowConfidence / totalSongs) * 100).toFixed(2)}%)
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
