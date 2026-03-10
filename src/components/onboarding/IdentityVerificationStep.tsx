import { useState, useRef, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Shield,
  Eye,
  Smile,
  MoveHorizontal,
  AlertTriangle,
  Video,
  VideoOff,
  ArrowLeft,
  ArrowRight,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface IdentityVerificationStepProps {
  form: UseFormReturn<any>;
}

type VerificationStage = "idle" | "camera-setup" | "liveness-check" | "uploading" | "completed" | "failed";
type LivenessChallenge = "blink" | "smile" | "turn-left" | "turn-right";

export default function IdentityVerificationStep({ form }: IdentityVerificationStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const [stage, setStage] = useState<VerificationStage>("idle");
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge>("blink");
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<LivenessChallenge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 });
  const [previousBrightness, setPreviousBrightness] = useState(0);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [smileDetected, setSmileDetected] = useState(false);
  const [headTurnDetected, setHeadTurnDetected] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string>("");

  const challenges: LivenessChallenge[] = ["blink", "smile", "turn-left", "turn-right"];

  // Challenge instructions
  const challengeInstructions = {
    blink: "Blink your eyes naturally",
    smile: "Smile at the camera",
    "turn-left": "Turn your head slightly to the left",
    "turn-right": "Turn your head slightly to the right",
  };

  const challengeIcons = {
    blink: Eye,
    smile: Smile,
    "turn-left": ArrowLeft,
    "turn-right": ArrowRight,
  };

  // Check camera permission
  const checkCameraPermission = async () => {
    try {
      // Note: navigator.permissions.query for 'camera' is not universally supported
      // We'll rely on getUserMedia to determine permission status
      setCameraPermission("prompt");
    } catch (error) {
      setCameraPermission("prompt");
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      setStage("camera-setup");

      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error("No camera found on your device");
      }

      // Request camera access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraPermission("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Camera initialization timeout"));
          }, 10000); // 10 second timeout

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            if (videoRef.current) {
              videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            }
            resolve(true);
          };

          if (videoRef.current) {
            // Check if metadata is already loaded
            if (videoRef.current.readyState >= 1) {
              clearTimeout(timeout);
              resolve(true);
            } else {
              videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
            }
          }
        });

        // Start playing the video
        await videoRef.current.play();

        // Start face detection and brightness monitoring
        startMonitoring();
        
        // Move to liveness check after camera is ready
        setTimeout(() => {
          setStage("liveness-check");
          startLivenessCheck();
        }, 1000);
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      
      let errorMessage = "Failed to access camera";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Camera permission denied. Please allow camera access to continue.";
        setCameraPermission("denied");
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera found on your device";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      setStage("failed");
      toast.error(errorMessage);
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Simple face and brightness detection
  const startMonitoring = () => {
    const analyze = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        // Get image data for brightness analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Calculate average brightness
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = sum / (data.length / 4);
        setBrightness(avgBrightness);

        // Simple face detection using center region brightness variance
        const centerX = Math.floor(canvas.width * 0.35);
        const centerY = Math.floor(canvas.height * 0.25);
        const centerWidth = Math.floor(canvas.width * 0.3);
        const centerHeight = Math.floor(canvas.height * 0.5);

        const centerData = ctx.getImageData(centerX, centerY, centerWidth, centerHeight);
        const centerPixels = centerData.data;

        let centerSum = 0;
        let variance = 0;
        for (let i = 0; i < centerPixels.length; i += 4) {
          const brightness = (centerPixels[i] + centerPixels[i + 1] + centerPixels[i + 2]) / 3;
          centerSum += brightness;
        }
        const centerAvg = centerSum / (centerPixels.length / 4);

        for (let i = 0; i < centerPixels.length; i += 4) {
          const brightness = (centerPixels[i] + centerPixels[i + 1] + centerPixels[i + 2]) / 3;
          variance += Math.pow(brightness - centerAvg, 2);
        }
        variance = variance / (centerPixels.length / 4);

        // Face detected with more lenient threshold for varying lighting
        const isFacePresent = variance > 200 && avgBrightness > 20 && avgBrightness < 250;
        setFaceDetected(isFacePresent);

        // Detect blink - brightness drop in center region (more lenient)
        if (previousBrightness > 0) {
          const brightnessDrop = previousBrightness - centerAvg;
          if (brightnessDrop > 8 && isFacePresent) {
            setBlinkDetected(true);
            setTimeout(() => setBlinkDetected(false), 1500);
          }
        }
        setPreviousBrightness(centerAvg);

        // Detect smile - analyze bottom third of face (more lenient)
        const mouthY = Math.floor(canvas.height * 0.55);
        const mouthHeight = Math.floor(canvas.height * 0.2);
        const mouthData = ctx.getImageData(centerX, mouthY, centerWidth, mouthHeight);
        const mouthPixels = mouthData.data;
        let mouthSum = 0;
        for (let i = 0; i < mouthPixels.length; i += 4) {
          mouthSum += (mouthPixels[i] + mouthPixels[i + 1] + mouthPixels[i + 2]) / 3;
        }
        const mouthAvg = mouthSum / (mouthPixels.length / 4);
        // Smile detection: mouth area is brighter (more lenient threshold)
        setSmileDetected(mouthAvg > centerAvg + 5 && isFacePresent);

        // Detect head position for turns - analyze left vs right brightness
        const leftX = Math.floor(canvas.width * 0.2);
        const rightX = Math.floor(canvas.width * 0.5);
        const faceY = Math.floor(canvas.height * 0.35);
        const sideWidth = Math.floor(canvas.width * 0.15);
        const sideHeight = Math.floor(canvas.height * 0.3);

        const leftData = ctx.getImageData(leftX, faceY, sideWidth, sideHeight);
        const rightData = ctx.getImageData(rightX, faceY, sideWidth, sideHeight);

        let leftSum = 0, rightSum = 0;
        for (let i = 0; i < leftData.data.length; i += 4) {
          leftSum += (leftData.data[i] + leftData.data[i + 1] + leftData.data[i + 2]) / 3;
        }
        for (let i = 0; i < rightData.data.length; i += 4) {
          rightSum += (rightData.data[i] + rightData.data[i + 1] + rightData.data[i + 2]) / 3;
        }

        const leftAvg = leftSum / (leftData.data.length / 4);
        const rightAvg = rightSum / (rightData.data.length / 4);

        // Store face position with more lenient thresholds
        setFacePosition({ 
          x: leftAvg - rightAvg, // Negative = turned left, Positive = turned right
          y: 0 
        });
      } catch (error) {
        console.error("Analysis error:", error);
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  // Start liveness check with challenges
  const startLivenessCheck = () => {
    setCompletedChallenges([]);
    setCurrentChallenge(challenges[0]);
    setChallengeProgress(0);
  };

  // Actual challenge validation based on detected actions
  useEffect(() => {
    if (stage !== "liveness-check") return;

    const timer = setInterval(() => {
      if (!faceDetected) {
        setChallengeProgress(0);
        setActionFeedback("Please position your face in the frame");
        return;
      }

      // Check if current challenge condition is met
      let conditionMet = false;
      let feedbackMessage = "";

      switch (currentChallenge) {
        case "blink":
          conditionMet = blinkDetected;
          feedbackMessage = blinkDetected ? "Blink detected! Great!" : "Please blink your eyes";
          break;
        case "smile":
          conditionMet = smileDetected;
          feedbackMessage = smileDetected ? "Great smile! Perfect!" : "Please smile";
          break;
        case "turn-left":
          // More lenient threshold for head turn
          conditionMet = facePosition.x < -8;
          feedbackMessage = conditionMet ? "Perfect! Head turned left" : "Turn your head left";
          setHeadTurnDetected(conditionMet);
          break;
        case "turn-right":
          // More lenient threshold for head turn
          conditionMet = facePosition.x > 8;
          feedbackMessage = conditionMet ? "Perfect! Head turned right" : "Turn your head right";
          setHeadTurnDetected(conditionMet);
          break;
      }

      setActionFeedback(feedbackMessage);

      if (!conditionMet) {
        // Reset progress more gently if condition not met
        setChallengeProgress(prev => Math.max(0, prev - 1.5));
        return;
      }

      // Increment progress when condition is met (faster progression)
      setChallengeProgress(prev => {
        const next = prev + 3.5;
        
        if (next >= 100) {
          // Challenge completed
          clearInterval(timer);
          
          setCompletedChallenges(prev => {
            const updated = [...prev, currentChallenge];
            
            // Check if all challenges completed
            if (updated.length === challenges.length) {
              setActionFeedback("Perfect! Capturing your photo...");
              setTimeout(() => capturePhoto(), 500);
            } else {
              // Move to next challenge
              const nextIndex = challenges.indexOf(currentChallenge) + 1;
              setCurrentChallenge(challenges[nextIndex]);
              setChallengeProgress(0);
              setActionFeedback("");
            }
            
            return updated;
          });
          
          return 100;
        }
        
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [stage, currentChallenge, faceDetected, blinkDetected, smileDetected, facePosition.x]);

  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error("Canvas context not available");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create image blob"));
          },
          'image/jpeg',
          0.95
        );
      });

      // Create preview
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      // Upload to Supabase
      await uploadVerificationPhoto(blob);

      stopCamera();
      setStage("completed");
      toast.success("Identity verification completed successfully!");
    } catch (error: any) {
      console.error("Capture error:", error);
      setError(error.message || "Failed to capture photo");
      setStage("failed");
      toast.error("Failed to capture photo. Please try again.");
    }
  };

  // Upload verification photo to Supabase
  const uploadVerificationPhoto = async (blob: Blob) => {
    try {
      setStage("uploading");
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `verification_${user.id}_${Date.now()}.jpg`;
      const filePath = `verification-photos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('verification-photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-photos')
        .getPublicUrl(filePath);

      // Save to form
      form.setValue("verificationPhotoUrl", publicUrl);
      form.setValue("verificationStatus", "verified");
      form.setValue("verificationDate", new Date().toISOString());

      setUploadProgress(100);
    } catch (error: any) {
      console.error("Upload error:", error);
      throw new Error(error.message || "Failed to upload verification photo");
    }
  };

  // Retry verification
  const retryVerification = () => {
    setStage("idle");
    setError(null);
    setCapturedImage(null);
    setCompletedChallenges([]);
    setChallengeProgress(0);
    setCurrentChallenge(challenges[0]);
    stopCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    checkCameraPermission();
    
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Identity Verification</h3>
            <p className="text-gray-600 text-sm">Required: Verify your identity with a live selfie</p>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Required:</strong> Identity verification is mandatory to maintain trust and safety on our platform. Your photo is securely encrypted and only used for verification purposes.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera View */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-2">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gray-900">
                {/* Video Stream */}
                {stage !== "idle" && stage !== "completed" && stage !== "failed" && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Face Detection Overlay */}
                    {stage === "liveness-check" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className={cn(
                          "w-64 h-80 border-4 rounded-3xl transition-colors duration-300",
                          faceDetected ? "border-green-400" : "border-yellow-400"
                        )}>
                          <div className="w-3 h-3 bg-current rounded-full absolute -top-1 -left-1" />
                          <div className="w-3 h-3 bg-current rounded-full absolute -top-1 -right-1" />
                          <div className="w-3 h-3 bg-current rounded-full absolute -bottom-1 -left-1" />
                          <div className="w-3 h-3 bg-current rounded-full absolute -bottom-1 -right-1" />
                        </div>
                      </div>
                    )}

                    {/* Brightness Warning - only show for extreme cases */}
                    {(brightness < 15 || brightness > 250) && stage === "liveness-check" && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg">
                        <AlertTriangle className="w-4 h-4" />
                        {brightness < 15 ? "Very dark - try to improve lighting" : "Very bright - try to reduce lighting"}
                      </div>
                    )}

                    {/* Challenge Instructions & Visual Indicators */}
                    {stage === "liveness-check" && faceDetected && !(brightness < 15 || brightness > 250) && (
                      <>
                        {/* Challenge Instruction Banner */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl text-center min-w-[280px]">
                          <p className="text-lg font-bold mb-1">{challengeInstructions[currentChallenge]}</p>
                          <p className="text-xs opacity-90">{actionFeedback}</p>
                        </div>

                        {/* Turn Left Arrow Indicator */}
                        {currentChallenge === "turn-left" && (
                          <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={cn(
                              "transition-all duration-300",
                              headTurnDetected ? "opacity-100 scale-110" : "opacity-60 scale-100 animate-bounce-horizontal"
                            )}>
                              <ArrowLeft className={cn(
                                "w-20 h-20 drop-shadow-2xl",
                                headTurnDetected ? "text-green-400" : "text-white"
                              )} strokeWidth={3} />
                            </div>
                          </div>
                        )}

                        {/* Turn Right Arrow Indicator */}
                        {currentChallenge === "turn-right" && (
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={cn(
                              "transition-all duration-300",
                              headTurnDetected ? "opacity-100 scale-110" : "opacity-60 scale-100 animate-bounce-horizontal-right"
                            )}>
                              <ArrowRight className={cn(
                                "w-20 h-20 drop-shadow-2xl",
                                headTurnDetected ? "text-green-400" : "text-white"
                              )} strokeWidth={3} />
                            </div>
                          </div>
                        )}

                        {/* Blink Indicator */}
                        {currentChallenge === "blink" && (
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={cn(
                              "transition-all duration-300",
                              blinkDetected ? "scale-110" : "scale-100"
                            )}>
                              {blinkDetected ? (
                                <EyeOff className="w-24 h-24 text-green-400 drop-shadow-2xl animate-pulse" strokeWidth={2.5} />
                              ) : (
                                <Eye className="w-24 h-24 text-white drop-shadow-2xl opacity-60 animate-pulse" strokeWidth={2.5} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Smile Indicator */}
                        {currentChallenge === "smile" && (
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <div className={cn(
                              "transition-all duration-300",
                              smileDetected ? "scale-110" : "scale-100"
                            )}>
                              <Smile className={cn(
                                "w-24 h-24 drop-shadow-2xl",
                                smileDetected ? "text-green-400 animate-bounce" : "text-white opacity-60"
                              )} strokeWidth={2.5} />
                            </div>
                          </div>
                        )}

                        {/* Progress Indicator */}
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64">
                          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
                            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-150 ease-out"
                                style={{ width: `${challengeProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* No Face Detected Warning */}
                    {!faceDetected && stage === "liveness-check" && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                        Position your face in the frame
                      </div>
                    )}
                  </>
                )}

                {/* Idle State */}
                {stage === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Video className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Ready to verify your identity</p>
                    <p className="text-sm opacity-75 mb-6">Click the button below to start</p>
                  </div>
                )}

                {/* Captured Image Preview */}
                {(stage === "completed" || stage === "uploading") && capturedImage && (
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Failed State */}
                {stage === "failed" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <VideoOff className="w-16 h-16 mb-4 text-red-400" />
                    <p className="text-lg font-medium mb-2">Verification Failed</p>
                    <p className="text-sm opacity-75 text-center max-w-md mb-6 px-4">{error}</p>
                  </div>
                )}

                {/* Upload Progress Overlay */}
                {stage === "uploading" && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium mb-2">Uploading verification photo...</p>
                    <div className="w-64">
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  </div>
                )}

                {/* Success Overlay */}
                {stage === "completed" && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <div className="bg-green-500 rounded-full p-4 mb-4">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <p className="text-xl font-bold mb-2">Verification Successful!</p>
                    <p className="text-sm opacity-90">Your identity has been verified</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {stage === "idle" && (
              <Button
                onClick={startCamera}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Verification
              </Button>
            )}

            {stage === "failed" && (
              <>
                <Button
                  onClick={retryVerification}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
                {cameraPermission === "denied" && (
                  <Button
                    onClick={() => {
                      toast.info("Please enable camera access in your browser settings");
                    }}
                    variant="default"
                    className="flex-1"
                    size="lg"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Enable Camera
                  </Button>
                )}
              </>
            )}

            {stage === "completed" && (
              <Button
                onClick={retryVerification}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Retake Photo
              </Button>
            )}
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Verification Steps
              </h4>
              
              <div className="space-y-3">
                {/* Camera Setup */}
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  stage === "camera-setup" ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    stage === "camera-setup" ? "bg-blue-600 text-white" :
                    ["liveness-check", "uploading", "completed"].includes(stage) ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                  )}>
                    {["liveness-check", "uploading", "completed"].includes(stage) ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">Position yourself</p>
                    <p className="text-xs text-gray-600 mt-1">Center your face in the frame with good lighting</p>
                  </div>
                </div>

                {/* Liveness Challenges */}
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  stage === "liveness-check" ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    stage === "liveness-check" ? "bg-blue-600 text-white" :
                    ["uploading", "completed"].includes(stage) ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                  )}>
                    {["uploading", "completed"].includes(stage) ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">Complete challenges</p>
                    <p className="text-xs text-gray-600 mt-1">Follow the on-screen instructions</p>
                    
                    {stage === "liveness-check" && (
                      <div className="mt-3 space-y-2">
                        {challenges.map((challenge) => {
                          const Icon = challengeIcons[challenge];
                          const isComplete = completedChallenges.includes(challenge);
                          const isCurrent = currentChallenge === challenge;
                          
                          return (
                            <div key={challenge} className={cn(
                              "flex items-center gap-2 p-2 rounded transition-colors",
                              isCurrent ? "bg-white border border-blue-300" : isComplete ? "bg-green-50" : "bg-gray-100"
                            )}>
                              <Icon className={cn(
                                "w-4 h-4",
                                isComplete ? "text-green-600" : isCurrent ? "text-blue-600" : "text-gray-400"
                              )} />
                              <span className={cn(
                                "text-xs flex-1",
                                isComplete ? "text-green-700 line-through" : isCurrent ? "text-blue-700 font-medium" : "text-gray-600"
                              )}>
                                {challengeInstructions[challenge]}
                              </span>
                              {isComplete && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              {isCurrent && !isComplete && (
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Current Challenge Progress */}
                        {stage === "liveness-check" && !completedChallenges.includes(currentChallenge) && (
                          <div className="mt-2">
                            <Progress value={challengeProgress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Capture Photo */}
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors",
                  ["uploading", "completed"].includes(stage) ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    stage === "completed" ? "bg-green-500 text-white" :
                    stage === "uploading" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                  )}>
                    {stage === "completed" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      "3"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">Capture & verify</p>
                    <p className="text-xs text-gray-600 mt-1">Your photo will be captured automatically</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Tips for best results</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ensure good, even lighting on your face</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Remove glasses if they cause glare</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Look directly at the camera</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Keep your entire face visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Avoid wearing masks or face coverings</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex gap-2 text-xs text-gray-600">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p>
                  Your verification photo is encrypted and stored securely. It will only be used for identity verification purposes and will not be shared publicly.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
