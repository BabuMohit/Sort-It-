import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMobileAppStore } from '../store/mobileAppStore';
import { NavigationProps } from '../navigation/types';

interface SettingsScreenProps extends NavigationProps {}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const {
    settings,
    permissions,
    deviceInfo,
    updateSettings,
    checkPermissions,
  } = useMobileAppStore();

  const handleToggleSetting = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
  };

  const handleGridColumnsChange = (columns: number) => {
    updateSettings({ gridColumns: columns });
  };

  const handleSwipeConfiguration = () => {
    navigation.navigate('SwipeConfiguration');
  };

  const handleStorageManagement = () => {
    navigation.navigate('StorageManagement');
  };

  const handlePermissionsCheck = async () => {
    try {
      const hasPermissions = await checkPermissions();
      Alert.alert(
        'Permissions Status',
        hasPermissions
          ? 'All required permissions are granted.'
          : 'Some permissions are missing. Please grant them in settings.',
        [
          { text: 'OK' },
          ...(hasPermissions ? [] : [{ text: 'Open Settings', onPress: () => navigation.navigate('PermissionOnboarding') }]),
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check permissions.');
    }
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode,
    showArrow: boolean = false
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && <Text style={styles.settingArrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSectionHeader('Display')}
        
        {renderSettingItem(
          'Grid Columns',
          `Currently showing ${settings.gridColumns} columns`,
          undefined,
          <View style={styles.gridSelector}>
            {[2, 3, 4, 5].map((columns) => (
              <TouchableOpacity
                key={columns}
                style={[
                  styles.gridOption,
                  settings.gridColumns === columns && styles.gridOptionSelected,
                ]}
                onPress={() => handleGridColumnsChange(columns)}
              >
                <Text
                  style={[
                    styles.gridOptionText,
                    settings.gridColumns === columns && styles.gridOptionTextSelected,
                  ]}
                >
                  {columns}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {renderSettingItem(
          'Dark Mode',
          'Automatically adapts to system theme',
          undefined,
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => handleToggleSetting('darkMode', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.darkMode ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSettingItem(
          'Animations',
          'Enable smooth transitions and effects',
          undefined,
          <Switch
            value={settings.animationsEnabled}
            onValueChange={(value) => handleToggleSetting('animationsEnabled', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.animationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSectionHeader('Gestures & Interaction')}

        {renderSettingItem(
          'Swipe Configuration',
          'Configure swipe directions for photo organization',
          handleSwipeConfiguration,
          undefined,
          true
        )}

        {renderSettingItem(
          'Haptic Feedback',
          'Vibration feedback for gestures',
          undefined,
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(value) => handleToggleSetting('hapticFeedback', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.hapticFeedback ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSettingItem(
          'Gesture Hints',
          'Show visual hints for available gestures',
          undefined,
          <Switch
            value={settings.enableGestureHints}
            onValueChange={(value) => handleToggleSetting('enableGestureHints', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.enableGestureHints ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSectionHeader('Storage & Performance')}

        {renderSettingItem(
          'Storage Management',
          `${formatStorageSize(deviceInfo.availableStorage)} available`,
          handleStorageManagement,
          undefined,
          true
        )}

        {renderSettingItem(
          'Thumbnail Quality',
          `Currently set to ${settings.thumbnailQuality}`,
          undefined,
          <View style={styles.qualitySelector}>
            {(['low', 'medium', 'high'] as const).map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityOption,
                  settings.thumbnailQuality === quality && styles.qualityOptionSelected,
                ]}
                onPress={() => updateSettings({ thumbnailQuality: quality })}
              >
                <Text
                  style={[
                    styles.qualityOptionText,
                    settings.thumbnailQuality === quality && styles.qualityOptionTextSelected,
                  ]}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {renderSettingItem(
          'Preload Adjacent Photos',
          'Improve browsing performance',
          undefined,
          <Switch
            value={settings.preloadAdjacentPhotos}
            onValueChange={(value) => handleToggleSetting('preloadAdjacentPhotos', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.preloadAdjacentPhotos ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSectionHeader('Safety & Backup')}

        {renderSettingItem(
          'Delete Confirmation',
          'Confirm before deleting photos',
          undefined,
          <Switch
            value={settings.deleteConfirmation}
            onValueChange={(value) => handleToggleSetting('deleteConfirmation', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.deleteConfirmation ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSettingItem(
          'Auto Backup',
          'Automatically backup organized photos',
          undefined,
          <Switch
            value={settings.autoBackup}
            onValueChange={(value) => handleToggleSetting('autoBackup', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.autoBackup ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSectionHeader('Permissions & Privacy')}

        {renderSettingItem(
          'App Permissions',
          'Check and manage app permissions',
          handlePermissionsCheck,
          <View style={styles.permissionStatus}>
            <View
              style={[
                styles.permissionIndicator,
                { backgroundColor: permissions.mediaLibrary ? '#4CAF50' : '#f44336' },
              ]}
            />
          </View>,
          true
        )}

        {renderSectionHeader('About')}

        {renderSettingItem(
          'Device Information',
          `${deviceInfo.deviceManufacturer} ${deviceInfo.deviceModel}`,
          undefined,
          <Text style={styles.deviceInfo}>
            Android {deviceInfo.androidVersion}
          </Text>
        )}

        {renderSettingItem(
          'App Version',
          'Sort It! Mobile Gallery',
          undefined,
          <Text style={styles.versionInfo}>v1.0.0</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sort It! Mobile Gallery App
          </Text>
          <Text style={styles.footerSubtext}>
            Organize your photos with intuitive swipe gestures
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingArrow: {
    fontSize: 20,
    color: '#c0c0c0',
    marginLeft: 8,
  },
  gridSelector: {
    flexDirection: 'row',
    marginRight: 8,
  },
  gridOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  gridOptionSelected: {
    backgroundColor: '#007AFF',
  },
  gridOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  gridOptionTextSelected: {
    color: '#ffffff',
  },
  qualitySelector: {
    flexDirection: 'row',
    marginRight: 8,
  },
  qualityOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginLeft: 8,
  },
  qualityOptionSelected: {
    backgroundColor: '#007AFF',
  },
  qualityOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  qualityOptionTextSelected: {
    color: '#ffffff',
  },
  permissionStatus: {
    marginRight: 8,
  },
  permissionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#666666',
  },
  versionInfo: {
    fontSize: 14,
    color: '#666666',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});