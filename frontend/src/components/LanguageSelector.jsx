import React, { useState, useRef, useEffect } from 'react';
import { Globe, Search, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';

export default function LanguageSelector({ variant = 'navbar' }) {
  const { language, setLanguage, languages, currentLanguageObj, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`language-selector-wrapper ${variant}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        className="lang-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('common.select_language', 'Select Language')}
        title={t('common.select_language', 'Select Language')}
      >
        <Globe size={16} className="lang-globe-icon" />
        <span className="lang-trigger-flag">{currentLanguageObj.flag}</span>
        <span className="lang-trigger-name">{currentLanguageObj.nativeName || currentLanguageObj.name}</span>
        <ChevronDown size={14} className={`lang-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Searchable Dropdown Modal Menu */}
      {isOpen && (
        <div className="lang-dropdown-menu glass-panel" role="listbox">
          {/* Search Header */}
          <div className="lang-search-header">
            <Search size={14} className="lang-search-icon" />
            <input 
              ref={searchInputRef}
              type="text"
              className="lang-search-input"
              placeholder={t('common.search', 'Search language...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search language"
            />
          </div>

          {/* Languages List */}
          <div className="lang-list-container">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <div
                    key={lang.code}
                    className={`lang-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectLanguage(lang.code)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="lang-option-flag">{lang.flag}</span>
                    <div className="lang-option-text">
                      <span className="lang-option-native">{lang.nativeName}</span>
                      <span className="lang-option-english">{lang.name}</span>
                    </div>
                    {isSelected && <Check size={16} className="lang-check-icon" />}
                  </div>
                );
              })
            ) : (
              <div className="lang-no-results">
                No matching language
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
