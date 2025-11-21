import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface KeyboardShortcutsHelperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: 'Ações de Validação',
    items: [
      { keys: ['A'], description: 'Aprovar verbete selecionado' },
      { keys: ['R'], description: 'Rejeitar verbete selecionado' },
      { keys: ['E'], description: 'Editar verbete selecionado' },
    ],
  },
  {
    category: 'Navegação',
    items: [
      { keys: ['↑', '↓'], description: 'Navegar entre verbetes' },
      { keys: ['Esc'], description: 'Desselecionar verbete' },
      { keys: ['Ctrl', 'F'], description: 'Focar campo de busca' },
    ],
  },
  {
    category: 'Visualização',
    items: [
      { keys: ['?'], description: 'Mostrar/Ocultar este modal' },
      { keys: ['Ctrl', 'K'], description: 'Abrir paleta de comandos' },
    ],
  },
];

export function KeyboardShortcutsHelper({ open, onOpenChange }: KeyboardShortcutsHelperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">⌨️</span>
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use esses atalhos para acelerar seu fluxo de trabalho de validação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <Badge
                          key={keyIdx}
                          variant="secondary"
                          className="font-mono text-xs px-2 py-1"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Pressione <Badge variant="secondary" className="font-mono mx-1">?</Badge> 
            a qualquer momento para abrir este modal rapidamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
