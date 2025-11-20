import { Download, Upload, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { convertCSVToDevices, generateCSVTemplate, parseDeviceCSV } from '../../utils/bulkOperations';
import type { CustomDevice } from '../../types/entities';

interface BulkImportDialogProps {
  onImport: (devices: CustomDevice[]) => void;
  onClose: () => void;
}

export default function BulkImportDialog({ onImport, onClose }: BulkImportDialogProps) {
  const [csvContent, setCsvContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setErrors([]);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'device_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleImport = () => {
    if (!csvContent.trim()) {
      toast.error('Please upload a CSV file first');
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    try {
      // Parse CSV
      const rows = parseDeviceCSV(csvContent);

      // Convert to devices (using 'new' as rackId since these are library devices)
      const result = convertCSVToDevices(rows, 'new');

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.devices && result.devices.length > 0) {
        // Convert Device to CustomDevice format
        const customDevices: CustomDevice[] = result.devices.map(device => ({
          id: device.id,
          name: device.name,
          manufacturer: device.manufacturer,
          model: `Imported-${device.device_type}`,
          device_type: device.device_type,
          size_u: device.size_u,
          port_count: device.port_count || 0,
          power_watts: device.power_watts || 0,
          description: `Imported from CSV`,
        }));

        onImport(customDevices);
        toast.success(`Successfully imported ${result.imported} device${result.imported !== 1 ? 's' : ''}`);

        if (result.failed > 0) {
          toast.error(`${result.failed} device${result.failed !== 1 ? 's' : ''} failed to import`);
        }

        if (result.errors.length === 0) {
          onClose();
        }
      } else if (result.errors.length === 0) {
        toast.error('No valid devices found in CSV');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV';
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel border-white/15 rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold gradient-text mb-2">Bulk Import Devices</h2>
            <p className="text-gray-300">Import multiple devices from a CSV file</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CSV Template Download */}
        <div className="glass-card border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">CSV Template</h3>
              <p className="text-gray-400 text-sm mb-3">
                Download the CSV template to see the required format and headers
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  <span className="font-semibold text-cyan-400">Required columns:</span> name, manufacturer, device_type, size_u
                </p>
                <p className="text-gray-300">
                  <span className="font-semibold text-cyan-400">Optional columns:</span> power_draw, port_count, position_u, management_ip
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="ghost"
              className="glass-button text-white hover:bg-white/10 flex-shrink-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="glass-card border-white/10 rounded-xl p-6 mb-6">
          <Label className="text-sm font-medium text-gray-400 mb-3 block">Upload CSV File</Label>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <div className="glass border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl p-8 text-center transition-all">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-white font-medium mb-1">
                  {csvContent ? 'File uploaded - Click to change' : 'Click to upload CSV file'}
                </p>
                <p className="text-gray-400 text-sm">or drag and drop</p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          {csvContent && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30">
              <p className="text-green-400 text-sm font-medium">
                ✓ CSV file loaded ({csvContent.split('\n').length - 1} rows)
              </p>
            </div>
          )}
        </div>

        {/* Errors Display */}
        {errors.length > 0 && (
          <div className="glass-card border-red-500/30 bg-red-500/10 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-400 mb-3">Import Errors</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {errors.map((error, index) => (
                <p key={index} className="text-red-300 text-sm">
                  • {error}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Valid Device Types Reference */}
        <div className="glass-card border-white/10 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Valid Device Types</h3>
          <div className="flex flex-wrap gap-2">
            {['router', 'switch', 'server', 'firewall', 'load_balancer', 'storage', 'pdu', 'ups', 'patch_panel', 'kvm', 'other'].map(type => (
              <span key={type} className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-gray-300 border border-white/10">
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="glass-button text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!csvContent || isProcessing}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isProcessing ? 'Importing...' : 'Import Devices'}
          </Button>
        </div>
      </div>
    </div>
  );
}
