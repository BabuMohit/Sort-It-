import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { NavigationProps } from '../navigation/types';
import { useMobileAppStore, useSwipeActions, useAlbums } from '../store/mobileAppStore';
import { AlbumAction, Album } from '../types';
import { materialColors } from '../theme/materialDesign';

interface SwipeConfigurationScreenProps extends NavigationProps {}

interface SwipeDirectionConfig {
  direction: 'left' | 'right' | 'up' | 'down';
  label: string;
  icon: string;
  description: string;
  color: string;
}

const swipeDirections: SwipeDirectionConfig[] = [
  {
    direction: 'left',
    label: 'Swipe Left',
    icon: '←',
    description: 'Quick archive or secondary action',
    color: materialColors.orange[500],
  },
  {
    direction: 'right',
    label: 'Swipe Right',
    icon: '→',
    description: 'Keep or primary action',
    color: materialColors.green[500],
  },
  {
    direction: 'up',
    label: 'Swipe Up',
    icon: '↑',
    description: 'Move to custom album',
    color: materialColors.blue[500],
  },
  {
    direction: 'down',
    label: 'Swipe Down',
    icon: '↓',
    description: 'Delete photo',
    color: materialColors.red[500],
  },
];

const actionTypes = [
  { type: 'move', label: 'Move to Album', icon: '📁', description: 'Move photo to selected album' },
  { type: 'copy', label: 'Copy to Album', icon: '📋', description: 'Copy photo to selected album' },
  { type: 'delete', label: 'Delete Photo', icon: '🗑️', description: 'Delete photo permanently' },
] as const;

export const SwipeConfigurationScreen: React.FC<SwipeConfigurationScreenProps> = ({
  navigation,
}) => {
  const { swipeConfig, settings } = useMobileAppStore();
  const { updateSwipeConfig, resetSwipeConfig } = useSwipeActions();
  const albums = useAlbums();
  
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [showActionPicker, setShowActionPicker] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const triggerHaptic = useCallback(() => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [settings.hapticFeedback]);

  const handleDirectionPress = (direction: 'left' | 'right' | 'up' | 'down') => {
    triggerHaptic();
    setSelectedDirection(direction);
    setShowActionPicker(true);
  };

  const handleActionSelect = (actionType: 'move' | 'copy' | 'delete') => {
    if (!selectedDirection) return;
    
    triggerHaptic();
    
    if (actionType === 'delete') {
      // For delete action, no album selection needed
      const newAction: AlbumAction = {
        type: 'delete',
        confirmationRequired: true,
        undoTimeout: settings.undoTimeout,
        hapticFeedback: settings.hapticFeedback,
      };
      
      updateSwipeConfig({
        [selectedDirection]: newAction,
      });
      
      setShowActionPicker(false);
      setSelectedDirection(null);
    } else {
      // For move/copy actions, show album picker
      setShowActionPicker(false);
      setShowAlbumPicker(true);
    }
  };

  const handleAlbumSelect = (album: Album) => {
    if (!selectedDirection) return;
    
    triggerHaptic();
    
    const currentAction = swipeConfig[selectedDirection] as AlbumAction;
    const actionType = currentAction?.type || 'move';
    
    const newAction: AlbumAction = {
      type: actionType as 'move' | 'copy',
      albumId: album.id,
      albumName: album.title,
      confirmationRequired: actionType === 'move' && album.type === 'system',
      undoTimeout: settings.undoTimeout,
      hapticFeedback: settings.hapticFeedback,
    };
    
    updateSwipeConfig({
      [selectedDirection]: newAction,
    });
    
    setShowAlbumPicker(false);
    setSelectedDirection(null);
  };

  const handleResetConfiguration = () => {
    Alert.alert(
      'Reset Configuration',
      'Are you sure you want to reset all swipe configurations to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            triggerHaptic();
            resetSwipeConfig();
          },
        },
      ]
    );
  };

  const handleToggleConfirmation = (direction: 'left' | 'right' | 'up' | 'down') => {
    const currentAction = swipeConfig[direction] as AlbumAction;
    if (currentAction) {
      updateSwipeConfig({
        [direction]: {
          ...currentAction,
          confirmationRequired: !currentAction.confirmationRequired,
        },
      });
    }
  };

  const getActionDescription = (action: AlbumAction | undefined) => {
    if (!action) return 'Not configured';
    
    switch (action.type) {
      case 'move':
        return `Move to ${action.albumName || 'Unknown Album'}`;
      case 'copy':
        return `Copy to ${action.albumName || 'Unknown Album'}`;
      case 'delete':
        return 'Delete photo';
      default:
        return 'Not configured';
    }
  };

  const renderDirectionCard = (directionConfig: SwipeDirectionConfig) => {
    const action = swipeConfig[directionConfig.direction] as AlbumAction;
    const isConfigured = action && action.type;
    
    return (
      <TouchableOpacity
        key={directionConfig.direction}
        style={[
          styles.directionCard,
          { borderLeftColor: directionConfig.color },
          isConfigured && styles.directionCardConfigured,
        ]}
        onPress={() => handleDirectionPress(directionConfig.direction)}
      >
        <View style={styles.directionHeader}>
          <View style={[styles.directionIcon, { backgroundColor: directionConfig.color }]}>
            <Text style={styles.directionIconText}>{directionConfig.icon}</Text>
          </View>
          <View style={styles.directionInfo}>
            <Text style={styles.directionLabel}>{directionConfig.label}</Text>
            <Text style={styles.directionDescription}>{directionConfig.description}</Text>
          </View>
          <Text style={styles.configureText}>Configure</Text>
        </View>
        
        <View style={styles.actionInfo}>
          <Text style={[
            styles.actionDescription,
            isConfigured ? styles.actionConfigured : styles.actionNotConfigured
          ]}>
            {getActionDescription(action)}
          </Text>
          
          {isConfigured && (
            <View style={styles.confirmationToggle}>
              <Text style={styles.confirmationLabel}>Require confirmation</Text>
              <Switch
                value={action.confirmationRequired}
                onValueChange={() => handleToggleConfirmation(directionConfig.direction)}
                trackColor={{ false: '#767577', true: directionConfig.color }}
                thumbColor={action.confirmationRequired ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      style={styles.albumItem}
      onPress={() => handleAlbumSelect(item)}
    >
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle}>{item.title}</Text>
        <Text style={styles.albumSubtitle}>
          {item.assetCount} photos • {item.type === 'system' ? 'System' : 'User'} album
        </Text>
      </View>
      <Text style={styles.selectText}>Select</Text>
    </TouchableOpacity>
  );

  const renderActionItem = (actionType: typeof actionTypes[0]) => (
    <TouchableOpacity
      key={actionType.type}
      style={styles.actionItem}
      onPress={() => handleActionSelect(actionType.type)}
    >
      <Text style={styles.actionIcon}>{actionType.icon}</Text>
      <View style={styles.actionInfo}>
        <Text style={styles.actionLabel}>{actionType.label}</Text>
        <Text style={styles.actionDescription}>{actionType.description}</Text>
      </View>
      <Text style={styles.selectText}>Select</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Swipe Configuration</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetConfiguration}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configure Swipe Actions</Text>
          <Text style={styles.sectionDescription}>
            Set up what happens when you swipe photos in different directions. 
            Each direction can move, copy, or delete photos.
          </Text>
        </View>
        
        <View style={styles.directionsContainer}>
          {swipeDirections.map(renderDirectionCard)}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gesture Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Minimum swipe distance</Text>
            <Text style={styles.settingValue}>{swipeConfig.gestureSettings.minimumSwipeDistance}px</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Minimum swipe velocity</Text>
            <Text style={styles.settingValue}>{swipeConfig.gestureSettings.minimumSwipeVelocity}px/s</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Haptic feedback</Text>
            <Switch
              value={swipeConfig.gestureSettings.hapticFeedbackEnabled}
              onValueChange={(value) => updateSwipeConfig({
                gestureSettings: {
                  ...swipeConfig.gestureSettings,
                  hapticFeedbackEnabled: value,
                }
              })}
              trackColor={{ false: '#767577', true: materialColors.blue[500] }}
              thumbColor={swipeConfig.gestureSettings.hapticFeedbackEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Picker Modal */}
      <Modal
        visible={showActionPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Action</Text>
              <TouchableOpacity onPress={() => setShowActionPicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bottomSheetContent}>
              {actionTypes.map(renderActionItem)}
            </View>
          </View>
        </View>
      </Modal>

      {/* Album Picker Modal */}
      <Modal
        visible={showAlbumPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlbumPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Select Album</Text>
              <TouchableOpacity onPress={() => setShowAlbumPicker(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={albums}
              renderItem={renderAlbumItem}
              keyExtractor={(item) => item.id}
              style={styles.albumList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: materialColors.red[50],
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: materialColors.red[600],
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  directionsContainer: {
    marginBottom: 24,
  },
  directionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  directionCardConfigured: {
    backgroundColor: '#f8f9fa',
  },
  directionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  directionIconText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  directionInfo: {
    flex: 1,
  },
  directionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  directionDescription: {
    fontSize: 14,
    color: '#666666',
  },
  configureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionInfo: {
    marginTop: 8,
  },
  actionDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  actionConfigured: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  actionNotConfigured: {
    color: '#999999',
    fontStyle: 'italic',
  },
  confirmationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#666666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  settingValue: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    fontSize: 18,
    color: '#666666',
    fontWeight: 'bold',
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 'auto',
  },
  albumList: {
    maxHeight: 400,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  albumSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
});