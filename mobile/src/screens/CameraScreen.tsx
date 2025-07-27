import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Button, IconButton, Card, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as MediaLibrary from 'expo-media-library';
import { ApiService } from '../services/ApiService';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [isRecording, setIsRecording] = useState(false);
  const [flash, setFlash] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();
    
    setHasPermission(
      cameraStatus.status === 'granted' && mediaLibraryStatus.status === 'granted'
    );
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsUploading(true);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: true,
        });

        // Save to device gallery
        await MediaLibrary.saveToLibraryAsync(photo.uri);

        // Upload to server
        await uploadPhoto(photo);

        Alert.alert(
          'Photo Captured',
          'Photo saved to gallery and uploaded successfully!',
          [
            {
              text: 'Take Another',
              style: 'default',
            },
            {
              text: 'View Jobs',
              onPress: () => navigation.navigate('Jobs'),
            },
          ]
        );
      } catch (error) {
        console.error('Photo capture error:', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const uploadPhoto = async (photo: any) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `camera-photo-${Date.now()}.jpg`,
      } as any);

      await ApiService.uploadFile('/api/files/upload', formData);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const toggleCameraType = () => {
    setType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlash(current => !current);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-off" size={64} color="#dc2626" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please enable camera and media library permissions in your device settings to use this feature.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermissions}
          style={styles.permissionButton}
        >
          Grant Permissions
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={type}
        flashMode={flash ? 'on' : 'off'}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <IconButton
              icon="arrow-left"
              iconColor="white"
              size={24}
              onPress={() => navigation.goBack()}
              style={styles.controlButton}
            />
            <IconButton
              icon={flash ? 'flash' : 'flash-off'}
              iconColor="white"
              size={24}
              onPress={toggleFlash}
              style={styles.controlButton}
            />
          </View>

          {/* Center Viewfinder */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder} />
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <View style={styles.controlsRow}>
              <IconButton
                icon="image"
                iconColor="white"
                size={32}
                onPress={() => navigation.navigate('Gallery')}
                style={styles.sideButton}
              />

              <View style={styles.captureButtonContainer}>
                {isUploading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <IconButton
                    icon="camera"
                    iconColor="white"
                    size={48}
                    onPress={takePicture}
                    style={styles.captureButton}
                    disabled={isUploading}
                  />
                )}
              </View>

              <IconButton
                icon="camera-switch"
                iconColor="white"
                size={32}
                onPress={toggleCameraType}
                style={styles.sideButton}
              />
            </View>

            {isUploading && (
              <Text style={styles.uploadingText}>
                Saving and uploading photo...
              </Text>
            )}
          </View>
        </View>
      </Camera>

      {/* Instructions Card */}
      <Card style={styles.instructionsCard}>
        <Card.Content style={styles.instructionsContent}>
          <Icon name="information" size={20} color="#2563eb" />
          <Text style={styles.instructionsText}>
            Photos are automatically saved to your gallery and uploaded to your account
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: width * 0.8,
    height: width * 0.8,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  bottomControls: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButtonContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButton: {
    backgroundColor: 'transparent',
  },
  sideButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  uploadingText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  instructionsCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  instructionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
});