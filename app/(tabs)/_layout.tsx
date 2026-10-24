import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarActiveTintColor: '#8BC34A',

        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,

          ...(Platform.OS === 'web'
            ? {
                position: 'fixed' as const,
                bottom: 0,
                left: 0,
                right: 0,
                width: '100%',
                zIndex: 1000,
              }
            : {}),
        },

        sceneStyle:
          Platform.OS === 'web' ? { paddingBottom: 68 } : undefined,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="batches"
        options={{
          title: 'Batches',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="tractor"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Central AI Scanner Button */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',

          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.scanButton,
                {
                  backgroundColor: '#8BC34A',
                  borderColor: theme.background,
                },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={27}
                color="#FFFFFF"
              />
            </View>
          ),

          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="document-text"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="storefront"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-sharp"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    borderWidth: 4,
    elevation: 6,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
});