"use client";

import { useState, useEffect } from "react";
import { IconSettings, IconX } from "@tabler/icons-react";
import cx from "@/utils/cx";

interface GroqConfig {
  apiKey: string;
  model: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GroqConfig) => void;
  currentConfig: GroqConfig;
}

export const SettingsModal = ({ isOpen, onClose, onSave, currentConfig }: SettingsModalProps) => {
  const [config, setConfig] = useState<GroqConfig>(currentConfig);

  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Groq Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <IconX size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key *
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your API key at{" "}
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                console.groq.com/keys
              </a>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="moonshotai/kimi-k2-instruct">moonshotai/kimi-k2-instruct</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!config.apiKey || !config.model}
            className={cx(
              "flex-1 px-4 py-2 rounded-lg text-white",
              config.apiKey && config.model
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            )}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Groq Settings"
    >
      <IconSettings size={20} className="text-gray-600" />
    </button>
  );
};