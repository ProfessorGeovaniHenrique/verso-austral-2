import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Music, Users, Award, BookOpen } from "lucide-react";

export function TabOrigensChamamé() {
  const timelineEvents = [
    { year: "1821", event: "Primeira menção: 'Cielito del chamamé'" },
    { year: "1857", event: "Juan Pedro Esnaola documenta o gênero" },
    { year: "1931", event: "Samuel Aguayo registra 'Corrientes Poty'" },
    { year: "1970", event: "Boom do Chamamé na Argentina" },
    { year: "2020", event: "UNESCO: Patrimônio Cultural Imaterial" }
  ];

  return (
    <div className="space-y-8">
      {/* Introdução - Cosmologia Guarani */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">As Raízes Guaranis</h2>
                <p className="text-muted-foreground leading-relaxed">
                  O Chamamé possui profunda <strong>carga cosmológica guarani</strong>, originando-se 
                  das práticas musicais dos povos originários da região do Prata. O nome deriva de 
                  <em> "che ama amé"</em>, expressão guarani que significa "estou à sombra" ou "estou 
                  debaixo da ramada", referindo-se aos espaços de encontro comunitário.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Características Musicais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Elementos Sagrados</h2>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold mb-2">O Tempo 6/8 (Binário Composto)</h3>
                    <p className="text-sm text-muted-foreground">
                      Ritmo característico do gênero, herdado das tradições musicais guaranis.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold mb-2">A Dança Circular Anti-Horária</h3>
                    <p className="text-sm text-muted-foreground">
                      Movimento ritual que conecta os dançarinos ao cosmos e à terra.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold mb-2">O Sapucay (Grito Sagrado)</h3>
                    <p className="text-sm text-muted-foreground">
                      Expressão vocal de sentido sagrado, manifestação da força vital guarani.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Cronologia: A Luta pelo Nome
            </h2>
            <div className="relative space-y-6">
              {/* Linha vertical */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-primary/20" />
              
              {timelineEvents.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Marcador */}
                  <div className="absolute left-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-background" />
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-bold text-primary">{item.year}</span>
                    <p className="text-foreground mt-1">{item.event}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Samuel Aguayo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-4">Samuel Claro Aguayo: O Guardião do Nome</h2>
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
              "Em 1931, Samuel Aguayo desafiou a rejeição ao termo 'Chamamé', registrando sua obra 
              'Corrientes Poty' e legitimando um nome que refletia a identidade ameríndia."
            </blockquote>
            <p className="text-foreground leading-relaxed">
              A resistência ao nome "Chamamé" espelhava o processo mais amplo de 
              <strong> apagamento da identidade ameríndia</strong> na construção das identidades 
              nacionais sul-americanas. Aguayo, ao insistir no termo, resgatou não apenas uma 
              nomenclatura, mas toda uma herança cultural que se tentava silenciar.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legado UNESCO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Reconhecimento Mundial</h2>
                <p className="text-foreground leading-relaxed mb-4">
                  Em 2020, o Chamamé foi declarado <strong>Patrimônio Cultural Imaterial da 
                  Humanidade</strong> pela UNESCO, consolidando seu valor como expressão cultural 
                  única que conecta tradições guaranis, europeias e platinas.
                </p>
                <p className="text-sm text-muted-foreground">
                  Este reconhecimento valida séculos de resistência cultural e celebra a riqueza 
                  da herança musical dos povos originários do Rio da Prata.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referência ABNT */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="pt-6 border-t border-border/50"
      >
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Referência</h3>
        <p className="text-sm text-foreground">
          BRITTES, Alejandro. <strong>A origem do Chamamé</strong>: Uma história para ser contada. 
          Simplíssimo, 2021.
        </p>
      </motion.div>
    </div>
  );
}
