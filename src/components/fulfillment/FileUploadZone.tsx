import { useCallback } from 'react';
import { Upload, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  title: string;
  description: string;
  isUploaded: boolean;
  onFileSelect: (file: File) => void;
  accept?: string;
}

export function FileUploadZone({ 
  title, 
  description, 
  isUploaded, 
  onFileSelect,
  accept = ".xlsx,.xls,.csv"
}: FileUploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30",
        isUploaded ? "border-success bg-success/5" : "border-border"
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center text-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isUploaded ? "bg-success/10" : "bg-muted"
        )}>
          {isUploaded ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        
        {!isUploaded && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Upload className="w-4 h-4" />
            <span>Arraste ou clique para enviar</span>
          </div>
        )}
        
        {isUploaded && (
          <span className="text-sm text-success font-medium">
            Arquivo carregado com sucesso!
          </span>
        )}
      </div>
    </div>
  );
}
