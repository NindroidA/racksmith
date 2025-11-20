import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cloneDevice } from '../../utils/deviceCloning';
import type { CustomDevice } from '../../types/entities';

interface CloneDeviceDialogProps {
  device: CustomDevice;
  onClose: () => void;
  onClone: (clonedDevice: CustomDevice) => void;
}

export default function CloneDeviceDialog({ device, onClose, onClone }: CloneDeviceDialogProps) {
  const [namePattern, setNamePattern] = useState(`{original} - Copy`);
  const [cloneCount, setCloneCount] = useState(1);

  const handleClone = () => {
    try {
      if (cloneCount < 1 || cloneCount > 10) {
        toast.error('Clone count must be between 1 and 10');
        return;
      }

      const clonedDevices: CustomDevice[] = [];

      for (let i = 1; i <= cloneCount; i++) {
        const cloned = cloneDevice(device as any, {
          namePattern: namePattern || `{original} - Copy {num}`,
          preservePosition: false,
        }, i) as CustomDevice;

        clonedDevices.push(cloned);
      }

      // Return all cloned devices
      clonedDevices.forEach(clonedDevice => onClone(clonedDevice));

      toast.success(`Successfully cloned ${cloneCount} device${cloneCount > 1 ? 's' : ''}`);
      onClose();
    } catch (error) {
      toast.error('Failed to clone device');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel border-white/15 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold gradient-text mb-6">Clone Device</h2>

        <div className="space-y-4 mb-6">
          {/* Original Device Info */}
          <div className="glass-card border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Cloning device:</p>
            <p className="text-lg font-semibold text-white">{device.name}</p>
            <p className="text-sm text-gray-400">{device.manufacturer} • {device.model}</p>
          </div>

          {/* Clone Count */}
          <div>
            <Label className="text-sm font-medium text-gray-400 mb-2">Number of Copies</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={cloneCount}
              onChange={(e) => setCloneCount(parseInt(e.target.value) || 1)}
              className="glass-input border-white/10 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum 10 copies at once</p>
          </div>

          {/* Name Pattern */}
          <div>
            <Label className="text-sm font-medium text-gray-400 mb-2">Name Pattern</Label>
            <Input
              type="text"
              value={namePattern}
              onChange={(e) => setNamePattern(e.target.value)}
              placeholder="{original} - Copy {num}"
              className="glass-input border-white/10 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use <code className="text-cyan-400">{'{original}'}</code> for device name, <code className="text-cyan-400">{'{num}'}</code> for copy number
            </p>
          </div>

          {/* Preview */}
          <div className="glass-card border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-2">Preview {cloneCount > 1 ? `(showing first 3)` : ''}:</p>
            <div className="space-y-1">
              {Array.from({ length: Math.min(cloneCount, 3) }).map((_, i) => {
                const previewName = (namePattern || '{original} - Copy {num}')
                  .replace('{original}', device.name)
                  .replace('{num}', String(i + 1));
                return (
                  <p key={i} className="text-sm text-white font-mono">
                    {i + 1}. {previewName}
                  </p>
                );
              })}
              {cloneCount > 3 && (
                <p className="text-xs text-gray-500 italic">... and {cloneCount - 3} more</p>
              )}
            </div>
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
            onClick={handleClone}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Clone {cloneCount > 1 ? `${cloneCount} Devices` : 'Device'}
          </Button>
        </div>
      </div>
    </div>
  );
}
