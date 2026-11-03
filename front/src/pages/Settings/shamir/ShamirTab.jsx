import React, { useState, useEffect } from 'react';
import { NewShamirConfig } from './NewShamirConfig';
import { ShamirRequests } from './ShamirRequests';
import { CurrentConfig } from './CurrentConfig';
import { ShamirPresentation } from './ShamirPresentation';
import { ConfigurationHistory } from './ConfigurationHistory';
import { toast } from 'react-toastify';
import { bankUrlFetch } from '../../../helpers/urlFetch';
import { i18n } from '../../../i18n/i18n';
import './ShamirTabs.css';
import { EditIcon } from '../../../helpers/icons/EditIcon';
import { PersonRoundIcon } from '../../../helpers/icons/PersonRoundIcon';
import { FileIcon } from '../../../helpers/icons/FileIcon';

const shamirPages = {
  presentation: 'presentation',
  currentConfig: 'currentConfig',
  newConfig: 'newConfig',
  configChange: 'configChange',
  requests: 'requests',
  configurationHistory: 'configurationHistory',
};

// Props : setIsLoading, onConfigsLoaded
export const ShamirTab = (p) => {
  const { setIsLoading } = p;
  const [currentPage, setCurrentPage] = useState(null);
  const cancelNewConfig = () => {
    setCurrentPage(shamirPages.presentation);
  };
  const cancelConfigChange = () => {
    setCurrentPage(shamirPages.currentConfig);
  };

  const [configs, setConfigs] = useState([]);
  const fetchConfigs = async () => {
    try {
      setIsLoading(true);
      const { configs } = await bankUrlFetch('/api/shamir-configs', 'POST', null);
      setConfigs(configs);
      p.onConfigsLoaded?.(configs);
      if (configs.length > 0) {
        setCurrentPage(shamirPages.currentConfig);
      } else {
        setCurrentPage(shamirPages.presentation);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.toString());
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchConfigs();
  }, []);

  const refreshConfigHistory = async () => {
    await fetchConfigs();
    setCurrentPage(shamirPages.configurationHistory);
  };

  const showNav =
    currentPage === shamirPages.currentConfig ||
    currentPage === shamirPages.requests ||
    currentPage === shamirPages.configurationHistory;

  const currentConfig = configs.find((c) => c.isActive);
  const pendingNewConfig = configs.find((c) => c.isPending);
  return (
    <div style={{ marginTop: 20 }} className="shamirTabs">
      {showNav && (
        <nav className="shamirTabsMenu">
          <button
            onClick={() => setCurrentPage(shamirPages.currentConfig)}
            className={`shamirTabItem ${currentPage === shamirPages.currentConfig ? 'current' : ''}`}
          >
            <span className="navIcon">
              <EditIcon size={16} />
            </span>
            {i18n.t('shamir_tab_config')}
          </button>
          <button
            onClick={() => setCurrentPage(shamirPages.requests)}
            className={`shamirTabItem ${currentPage === shamirPages.requests ? 'current' : ''}`}
          >
            <span className="navIcon">
              <PersonRoundIcon size={16} />
            </span>
            {i18n.t('shamir_tab_requests')}
          </button>
          <button
            onClick={() => setCurrentPage(shamirPages.configurationHistory)}
            className={`shamirTabItem ${currentPage === shamirPages.configurationHistory ? 'current' : ''}`}
          >
            <span className="navIcon">
              <FileIcon size={16} />
            </span>
            {i18n.t('shamir_tab_history')}
          </button>
        </nav>
      )}
      <div className="shamirTabContent">
        {currentPage === shamirPages.presentation && (
          <ShamirPresentation onStartConfig={() => setCurrentPage(shamirPages.newConfig)} />
        )}
        {currentPage === shamirPages.newConfig && (
          <NewShamirConfig
            previousConfig={null}
            setIsLoading={p.setIsLoading}
            onCancel={cancelNewConfig}
            onConfigCreated={fetchConfigs}
          />
        )}
        {currentPage === shamirPages.configChange && (
          <NewShamirConfig
            previousConfig={currentConfig}
            setIsLoading={p.setIsLoading}
            onCancel={cancelConfigChange}
            onConfigCreated={fetchConfigs}
          />
        )}
        {currentPage === shamirPages.currentConfig && (
          <CurrentConfig
            setIsLoading={setIsLoading}
            currentConfig={currentConfig}
            pendingNewConfig={pendingNewConfig}
            onStartEdit={() => setCurrentPage(shamirPages.configChange)}
            onDeletePendingConfig={fetchConfigs}
          />
        )}
        {currentPage === shamirPages.requests && <ShamirRequests setIsLoading={setIsLoading} />}
        {currentPage === shamirPages.configurationHistory && (
          <ConfigurationHistory configs={configs} onRefresh={refreshConfigHistory} />
        )}
      </div>
    </div>
  );
};
