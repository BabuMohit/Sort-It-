import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { PermissionStatus } from '../types';

export interface PermissionStatusBadgeProps {
  status?: PermissionStatus;
  onPress?: () => void;
  style?: ViewStyle;
}

export const PermissionStatusBadge: React.FC<PermissionStatusBadgeProps> = ({
  status = 'granted',
  onPress,
  style,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#F44336';
      case 'undetermined':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'undetermined':
        return 'Not Set';
      default:
        return 'Unknown';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        { backgroundColor: getStatusColor() },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.badgeText}>{getStatusText()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});