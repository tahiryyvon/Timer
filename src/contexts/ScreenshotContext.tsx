'use client';

import { createContext, useContext, ReactNode, useRef, useCallback, useState, useEffect } from 'react';

interface ScreenshotContextType {
  startRandomCapture: () => Promise<void>;
  stopCapture: () => void;
  captureScreenshot: () => Promise<void>;
  captureTestScreenshot: () => Promise<void>;
  permissionGranted: boolean;
  permissionDenied: boolean;
  isCapturing: boolean;
  requestScreenSharePermission: () => Promise<boolean>;
  exportStoredScreenshots: () => Promise<void>;
  checkStoredScreenshots: () => number;
  chooseScreenshotDirectory: () => Promise<boolean>;
}

const ScreenshotContext = createContext<ScreenshotContextType | undefined>(undefined);

interface ScreenshotProviderProps {
  children: ReactNode;
}

export function ScreenshotProvider({ children }: ScreenshotProviderProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const permissionRequestedRef = useRef(false);
  const isMonitoringRef = useRef(false);
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Fallback download method
  const fallbackDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);
  
  // Store screenshots in localStorage as backup
  const saveToLocalStorage = useCallback(async (blob: Blob, filename: string) => {
    try {
      console.log(`Storing screenshot in localStorage: ${filename}, blob size: ${blob.size} bytes`);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64data = reader.result as string;
          console.log('Base64 data generated, length:', base64data.length, 'starts with:', base64data.substring(0, 50));
          
          // Validate base64 data
          if (!base64data || !base64data.startsWith('data:image/')) {
            console.error('Invalid base64 data generated');
            return;
          }
          
          const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
          screenshots.push({
            filename,
            data: base64data,
            timestamp: new Date().toISOString()
          });
          
          // Keep only last 50 screenshots to prevent storage overflow
          if (screenshots.length > 50) {
            screenshots.splice(0, screenshots.length - 50);
          }
          
          localStorage.setItem('screenshots', JSON.stringify(screenshots));
          console.log(`Screenshot stored successfully: ${filename}, total screenshots: ${screenshots.length}`);
        } catch (error) {
          console.error('Failed to store in localStorage:', error);
        }
      };
      
      reader.onerror = () => {
        console.error('FileReader error occurred while converting blob to base64');
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Failed to save screenshot:', error);
    }
  }, []);

  // Automatically save screenshots to file system
  const saveToFileSystem = useCallback(async (blob: Blob, filename: string) => {
    try {
      console.log(`Auto-saving screenshot to file system: ${filename}`);
      
      // For supported browsers (Chrome/Edge), try to use pre-selected directory
      if ('showDirectoryPicker' in window && (window as any).screenshotDirectoryHandle) {
        try {
          const directoryHandle = (window as any).screenshotDirectoryHandle;
          const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log(`Screenshot automatically saved to selected folder: ${filename}`);
          return;
        } catch (fsError) {
          console.log('Failed to save to selected directory, falling back to downloads:', fsError);
        }
      }
      
      // Instead of downloading (which prompts), store in localStorage for batch export
      console.log('No directory selected - storing in localStorage for batch export');
      await saveToLocalStorage(blob, filename);
      
    } catch (error) {
      console.error('Failed to save screenshot to file system:', error);
      // Store in localStorage as last resort
      await saveToLocalStorage(blob, filename);
    }
  }, [saveToLocalStorage]);

  // Function to let user choose screenshot save directory
  const chooseScreenshotDirectory = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Directory selection is not supported in this browser. Screenshots will be saved to Downloads folder.');
      return false;
    }

    try {
      const directoryHandle = await (window as any).showDirectoryPicker({
        id: 'screenshots',
        mode: 'readwrite'
      });
      
      (window as any).screenshotDirectoryHandle = directoryHandle;
      console.log('Screenshot directory selected:', directoryHandle.name);
      alert(`Screenshots will now be saved to: ${directoryHandle.name}`);
      return true;
    } catch (error) {
      console.log('Directory selection cancelled or failed:', error);
      return false;
    }
  }, []);

  const requestScreenSharePermission = useCallback(async () => {
    console.log('=== Permission Request Debug ===');
    console.log('permissionRequestedRef.current:', permissionRequestedRef.current);
    console.log('permissionDenied:', permissionDenied);
    console.log('permissionGranted:', permissionGranted);
    
    // Don't request if already requested or denied
    if (permissionRequestedRef.current || permissionDenied || permissionGranted) {
      console.log('Skipping permission request - already handled');
      return permissionGranted;
    }

    try {
      permissionRequestedRef.current = true;
      
      console.log('Requesting screen sharing permission...');
      
      // Check if browser supports getDisplayMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.error('Screen capture not supported in this browser');
        setPermissionDenied(true);
        return false;
      }
      
      // Request screen share permission once and keep the stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 10, max: 15 }
        },
        audio: false
      });
      
      console.log('Stream obtained successfully:', stream);
      console.log('Video track settings:', stream.getVideoTracks()[0].getSettings());
      
      streamRef.current = stream;
      setPermissionGranted(true);
      setPermissionDenied(false);
      
      console.log('Screen sharing permission granted');
      
      // Handle when user stops sharing manually
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('User stopped screen sharing');
        setPermissionGranted(false);
        streamRef.current = null;
        isMonitoringRef.current = false;
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
      });

      return true;
    } catch (error) {
      console.log('Screenshot monitoring disabled - screen sharing permission not granted:', error);
      setPermissionGranted(false);
      setPermissionDenied(true);
      return false;
    }
  }, [permissionDenied, permissionGranted]);

  const captureScreenshot = useCallback(async () => {
    console.log('=== Manual Screenshot Capture ===');
    console.log('Current state - isCapturing:', isCapturingRef.current, 'hasStream:', !!streamRef.current);
    console.log('Permission granted:', permissionGranted, 'Permission denied:', permissionDenied);
    
    // If no permission yet, try to get it
    if (!permissionGranted && !permissionDenied) {
      console.log('No permission yet, requesting...');
      const granted = await requestScreenSharePermission();
      if (!granted) {
        console.log('Permission denied, cannot capture screenshot');
        return;
      }
    }
    
    if (isCapturingRef.current || !streamRef.current) {
      console.log('Skipping capture - already capturing or no stream');
      return;
    }
    
    try {
      isCapturingRef.current = true;
      setIsCapturing(true);
      console.log('Starting screenshot capture process...');

      const stream = streamRef.current;
      
      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      
      // Wait for video to be ready and loaded
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000); // Increased timeout
        
        let attempts = 0;
        const checkVideo = () => {
          attempts++;
          console.log(`Checking video readiness, attempt ${attempts}`);
          console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          console.log('Video ready state:', video.readyState);
          console.log('Video current time:', video.currentTime);
          
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            clearTimeout(timeout);
            console.log('Video is ready for capture');
            resolve(true);
          } else if (attempts < 20) {
            setTimeout(checkVideo, 500); // Check every 500ms
          } else {
            clearTimeout(timeout);
            reject(new Error('Video failed to become ready after multiple attempts'));
          }
        };
        
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          checkVideo();
        };
        
        video.onloadeddata = () => {
          console.log('Video data loaded');
          checkVideo();
        };
        
        video.oncanplay = () => {
          console.log('Video can play');
          checkVideo();
        };
        
        video.onerror = (e) => {
          console.error('Video error:', e);
          clearTimeout(timeout);
          reject(new Error('Video load error'));
        };
        
        // Start playing the video
        video.play().then(() => {
          console.log('Video play started');
          setTimeout(checkVideo, 100); // Initial check after play
        }).catch(reject);
      });
      
      // Add a longer delay to ensure video is fully rendering
      console.log('Waiting for video to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(video.videoWidth || 1920, 800);
      canvas.height = Math.max(video.videoHeight || 1080, 600);
      
      console.log('Final video dimensions:', video.videoWidth, 'x', video.videoHeight);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Video ready state:', video.readyState);
      console.log('Video current time:', video.currentTime);
      console.log('Video paused:', video.paused);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Invalid video dimensions: ' + canvas.width + 'x' + canvas.height);
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Clear canvas with white background first
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Try to draw the video frame multiple times if first attempt fails
      let captureSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Capture attempt ${attempt}`);
        
        try {
          // Draw the video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Check if we actually captured something meaningful
          const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
          const data = imageData.data;
          let hasContent = false;
          let colorVariation = 0;
          
          for (let i = 0; i < data.length; i += 16) { // Sample pixels
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r !== 255 || g !== 255 || b !== 255) { // Not pure white (our background)
              hasContent = true;
              colorVariation++;
            }
          }
          
          console.log(`Attempt ${attempt} - Has content: ${hasContent}, Color variation: ${colorVariation}`);
          
          if (hasContent && colorVariation > 10) {
            captureSuccess = true;
            console.log('Capture successful!');
            break;
          } else {
            console.log(`Attempt ${attempt} failed, retrying...`);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (drawError) {
          console.error(`Draw attempt ${attempt} failed:`, drawError);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // If capture failed after all attempts, create a diagnostic image
      if (!captureSuccess) {
        console.warn('All capture attempts failed, creating diagnostic image');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Screen Capture Failed', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillText('Video dimensions: ' + video.videoWidth + 'x' + video.videoHeight, canvas.width / 2, canvas.height / 2);
        ctx.fillText('Ready state: ' + video.readyState, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Current time: ' + video.currentTime.toFixed(2), canvas.width / 2, canvas.height / 2 + 80);
        ctx.fillText('Paused: ' + video.paused, canvas.width / 2, canvas.height / 2 + 120);
        ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 160);
      }
      
      // Check if we actually captured anything (avoid completely black images)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let hasNonBlackPixels = false;
      let totalBrightness = 0;
      
      // Check pixels to see if we have actual content
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        if (brightness > 15) { // Allow for slight variations
          hasNonBlackPixels = true;
        }
      }
      
      const averageBrightness = totalBrightness / (data.length / 4);
      console.log('Image analysis - Average brightness:', averageBrightness, 'Has non-black pixels:', hasNonBlackPixels);
      
      if (!hasNonBlackPixels || averageBrightness < 10) {
        console.warn('Captured image appears to be mostly black - creating fallback pattern');
        // Add a fallback pattern so we can see something was captured
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Screen Capture Issue', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Image appears mostly black', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Check screen sharing permissions', canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 100);
      }
      
      // Clean up video element
      video.srcObject = null;

      // Convert canvas to blob for file handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            console.log('Screenshot blob created successfully, size:', blob.size);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob or blob is empty'));
          }
        }, 'image/png', 0.9);
      });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      
      console.log('Screenshot captured, saving as:', filename, 'Size:', blob.size, 'bytes');
      
      // Save screenshot to localStorage (primary method now)
      await saveToLocalStorage(blob, filename);
      
      // Also save to file system automatically if configured
      await saveToFileSystem(blob, filename);

    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [saveToFileSystem, saveToLocalStorage, permissionGranted, permissionDenied, requestScreenSharePermission]);

  // Test screenshot function without screen capture
  const captureTestScreenshot = useCallback(async () => {
    try {
      setIsCapturing(true);
      console.log('Creating test screenshot...');

      // Create a test canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Create a colorful test pattern
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(0.5, '#4ECDC4');
      gradient.addColorStop(1, '#45B7D1');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Test Screenshot', canvas.width / 2, canvas.height / 2);
      ctx.font = '20px Arial';
      ctx.fillText(new Date().toLocaleString(), canvas.width / 2, canvas.height / 2 + 50);
      
      // Add geometric shapes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(100, 100, 30, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillRect(canvas.width - 130, 70, 60, 60);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            console.log('Test screenshot blob created successfully, size:', blob.size);
            resolve(blob);
          } else {
            reject(new Error('Failed to create test blob'));
          }
        }, 'image/png', 0.9);
      });

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-screenshot-${timestamp}.png`;
      
      // Save to localStorage
      await saveToLocalStorage(blob, filename);
      console.log('Test screenshot saved successfully');

    } catch (error) {
      console.error('Error creating test screenshot:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [saveToLocalStorage]);

  // Function to export all stored screenshots
  const exportStoredScreenshots = useCallback(async () => {
    try {
      const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
      
      console.log('=== Export Debug Info ===');
      console.log('Total screenshots stored:', screenshots.length);
      
      if (screenshots.length === 0) {
        alert('No screenshots found in storage.\n\nTo capture screenshots:\n1. Start a timer\n2. Grant screen sharing permission\n3. Screenshots will be taken automatically at random intervals between 2-10 minutes');
        return;
      }
      
      const confirmExport = confirm(`Found ${screenshots.length} screenshots in storage.\n\nThis will download all screenshots to your Downloads folder.\n\nProceed with download?`);
      if (!confirmExport) {
        return;
      }
      
      console.log('Screenshot details:', screenshots.map((s: { filename: string; data: string; timestamp: string }) => ({
        filename: s.filename,
        timestamp: s.timestamp,
        size: s.data.length
      })));
      
      let downloadCount = 0;
      const totalCount = screenshots.length;
      
      // Show progress
      const progressAlert = () => {
        if (downloadCount === totalCount) {
          alert(`✅ Export complete!\n\nSuccessfully downloaded ${totalCount} screenshots to your Downloads folder.`);
        }
      };
      
      // Download each screenshot with small delays to avoid overwhelming the browser
      screenshots.forEach((screenshot: { filename: string; data: string; timestamp: string }, index: number) => {
        setTimeout(() => {
          // Convert base64 back to blob
          fetch(screenshot.data)
            .then(res => res.blob())
            .then(blob => {
              fallbackDownload(blob, screenshot.filename);
              downloadCount++;
              console.log(`Downloaded ${downloadCount}/${totalCount}: ${screenshot.filename}`);
              progressAlert();
            })
            .catch(error => {
              console.error('Failed to export screenshot:', error);
              downloadCount++;
              progressAlert();
            });
        }, index * 100); // 100ms delay between downloads
      });
      
      console.log(`Started export of ${screenshots.length} screenshots`);
      
    } catch (error) {
      console.error('Failed to export screenshots:', error);
      alert('❌ Failed to export screenshots. Check console for details.');
    }
  }, [fallbackDownload]);

  // Debug function to check localStorage content
  const checkStoredScreenshots = useCallback(() => {
    try {
      const screenshots = JSON.parse(localStorage.getItem('screenshots') || '[]');
      console.log('=== Screenshot Storage Debug ===');
      console.log('Screenshots in storage:', screenshots.length);
      console.log('Permission granted:', permissionGranted);
      console.log('Permission denied:', permissionDenied);
      console.log('Is monitoring active:', isMonitoringRef.current);
      console.log('Has stream:', !!streamRef.current);
      console.log('Raw localStorage data:', localStorage.getItem('screenshots'));
      
      if (screenshots.length > 0) {
        console.log('Latest screenshot:', screenshots[screenshots.length - 1].timestamp);
      }
      
      return screenshots.length;
    } catch (error) {
      console.error('Error checking stored screenshots:', error);
      return 0;
    }
  }, [permissionGranted, permissionDenied]);

  const scheduleNextCapture = useCallback(() => {
    if (!isMonitoringRef.current || !streamRef.current) {
      console.log('Cannot schedule next capture - monitoring:', isMonitoringRef.current, 'stream:', !!streamRef.current);
      return;
    }
    
    // Random interval between 2-10 minutes (120000-600000 ms)
    const randomInterval = Math.floor(Math.random() * (600000 - 120000) + 120000);
    console.log(`Next screenshot randomly scheduled in ${Math.round(randomInterval / 1000)} seconds (${Math.round(randomInterval / 60000)} minutes)`);
    
    intervalRef.current = setTimeout(() => {
      if (isMonitoringRef.current && streamRef.current) {
        console.log('Taking scheduled screenshot...');
        captureScreenshot().then(() => {
          scheduleNextCapture(); // Schedule the next one
        }).catch(error => {
          console.error('Failed to capture screenshot:', error);
          scheduleNextCapture(); // Continue scheduling even if one fails
        });
      } else {
        console.log('Skipping screenshot - monitoring stopped or no stream');
      }
    }, randomInterval);
  }, [captureScreenshot]);

  const startRandomCapture = useCallback(async () => {
    console.log('=== Starting screenshot monitoring ===');
    console.log('Current state - monitoring:', isMonitoringRef.current, 'permission granted:', permissionGranted, 'permission denied:', permissionDenied);
    
    // Prevent multiple starts
    if (isMonitoringRef.current) {
      console.log('Screenshot monitoring already active');
      return;
    }

    console.log('Starting screenshot monitoring...');

    // If permission was denied, don't try to start monitoring
    if (permissionDenied) {
      console.log('Screenshot monitoring disabled - permission was previously denied');
      return;
    }

    // Only request permission if not already granted and not already requested
    if (!permissionGranted && !permissionRequestedRef.current) {
      console.log('Requesting screen share permission...');
      const granted = await requestScreenSharePermission();
      if (!granted) {
        console.log('Screenshot monitoring disabled - permission denied');
        return;
      }
    }

    // Don't start if we still don't have permission or stream
    if (!permissionGranted || !streamRef.current) {
      console.log('Screenshot monitoring disabled - no permission or stream available. Permission:', permissionGranted, 'Stream:', !!streamRef.current);
      return;
    }

    isMonitoringRef.current = true;
    console.log('Screenshot monitoring state set to active, scheduling first capture...');
    scheduleNextCapture();
    console.log('Screenshot monitoring started successfully');
  }, [permissionGranted, permissionDenied, requestScreenSharePermission, scheduleNextCapture]);

  const stopCapture = useCallback(() => {
    console.log('Stopping screenshot monitoring...');
    
    isMonitoringRef.current = false;
    
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Keep the stream active for potential future use
    // Only stop it on component unmount or manual user action
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up screenshot monitoring...');
      isMonitoringRef.current = false;
      
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const value = {
    startRandomCapture,
    stopCapture,
    captureScreenshot,
    captureTestScreenshot,
    permissionGranted,
    permissionDenied,
    isCapturing,
    requestScreenSharePermission,
    exportStoredScreenshots,
    checkStoredScreenshots,
    chooseScreenshotDirectory,
  };

  return (
    <ScreenshotContext.Provider value={value}>
      {children}
    </ScreenshotContext.Provider>
  );
}

export function useScreenshotCapture() {
  const context = useContext(ScreenshotContext);
  if (context === undefined) {
    throw new Error('useScreenshotCapture must be used within a ScreenshotProvider');
  }
  return context;
}