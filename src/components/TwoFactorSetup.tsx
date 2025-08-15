
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, CheckCircle } from "lucide-react";

interface TwoFactorSetupProps {
  tempUserId: string;
  onSetupComplete: () => void;
  onCancel?: () => void;
}

export const TwoFactorSetup = ({ tempUserId, onSetupComplete, onCancel }: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleSetup2FA = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer temp_${tempUserId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup 2FA');
      }

      const data = await response.json();
      
      console.log('2FA Setup response:', data);
      
      setQrCodeUrl(data.qrCode); // This should be the otpauth:// URL
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('verify');
      
    } catch (error: any) {
      console.error('2FA Setup error:', error);
      setError(error.message);
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/enable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer temp_${tempUserId}`,
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify 2FA code');
      }

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
      
      onSetupComplete();
      
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'secret' | 'backupCodes') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      }
      toast({
        title: "Copied",
        description: `${type === 'secret' ? 'Secret key' : 'Backup codes'} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Generate QR code from otpauth URL using a QR code generator
  const generateQRCodeUrl = (otpauthUrl: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          {step === 'setup' ? 'Setup Two-Factor Authentication' : 'Verify Your Setup'}
        </CardTitle>
        <p className="text-muted-foreground">
          {step === 'setup' 
            ? 'Two-factor authentication is required for your role' 
            : 'Enter the code from your authenticator app'
          }
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {step === 'setup' ? (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You'll need an authenticator app like Google Authenticator, Authy, or 1Password to continue.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleSetup2FA} 
              disabled={isLoading} 
              className="w-full"
            >
              {isLoading ? 'Setting up...' : 'Setup 2FA'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="text-center space-y-4">
              <h3 className="font-medium">1. Scan QR Code</h3>
              <div className="bg-white p-4 rounded-lg inline-block">
                {qrCodeUrl ? (
                  <img 
                    src={generateQRCodeUrl(qrCodeUrl)} 
                    alt="2FA QR Code" 
                    className="w-48 h-48"
                    onError={(e) => {
                      console.error('QR Code failed to load:', qrCodeUrl);
                      setError('Failed to generate QR code. Please use manual entry.');
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading QR Code...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <h3 className="font-medium">2. Or enter manually:</h3>
              <div className="flex items-center gap-2">
                <Input 
                  value={secret} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(secret, 'secret')}
                >
                  {copiedSecret ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Backup Codes */}
            <div className="space-y-2">
              <h3 className="font-medium">3. Save your backup codes:</h3>
              <div className="bg-muted p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-1 text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'backupCodes')}
                className="w-full"
              >
                {copiedBackupCodes ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Backup Codes
              </Button>
            </div>

            {/* Verification */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">4. Enter verification code:</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={handleVerify2FA} 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? 'Verifying...' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
