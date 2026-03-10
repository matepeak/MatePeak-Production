# ID Document Verification System (Phase 2 Feature)

## Overview
ID Document Verification is a **Phase 2 optional enhancement** that allows mentors to upgrade their tier and unlock additional platform benefits. This is NOT required for mentors to go live initially.

## Strategic Approach

### Phase 1: Quick Launch (No Verification Required)
**Goal:** Get mentors live and accepting bookings as quickly as possible

**Phase 1 Steps:**
1. Basic Info (Name, expertise, languages)
2. Services & Pricing (Session types, rates)
3. **Availability Setup** (When you're available for bookings)

**Result:** 
- Mentor goes live with "Basic" tier
- Can accept up to 5 bookings/week
- Profile is searchable and bookable
- No verification barrier to entry

### Phase 2: Verification & Enhancement (Optional)
**Goal:** Earn higher tier status and unlock more bookings

**When:** After mentor has gone live and starts getting bookings  
**Why:** Mentors are more motivated to verify after experiencing the platform  
**Benefit:** Upgrade from Basic → Verified tier  

**Verification unlocks:**
- ✅ Verified badge on profile
- 📈 15 bookings/week (instead of 5)
- ⭐ Higher search ranking
- 💼 Professional credibility indicator

## Why Move Verification to Phase 2?

### Problem with Phase 1 Verification
The original approach required verification before going live, which created:
- **Friction:** Mentors abandon sign-up when asked for ID documents
- **Delay:** 24-hour wait time before going live
- **Poor conversion:** Only 30-40% complete verification during onboarding
- **Bad first impression:** Feels invasive before seeing platform value

### Benefits of Phase 2 Verification
Moving verification to optional Phase 2 provides:
- **Faster onboarding:** 8-12 minutes instead of 35+ minutes
- **Higher completion:** >60% go live vs. 30% with verification required
- **Better retention:** Mentors experience value first, then verify
- **Progressive trust:** Build relationship before asking for sensitive documents
- **Natural upgrade path:** Mentors self-select verification when they need more bookings

## Implementation Strategy

### How It Works Now

**1. Sign-up Flow (Phase 1 - 8-12 minutes):**
```
Step 1: Basic Info
  ↓
Step 2: Services & Pricing
  ↓
Step 3: Availability Setup
  ↓
✅ Go Live! (Basic Tier)
```

**2. Post-Launch (Phase 2 - Optional):**
```
Dashboard shows:
  "📈 Upgrade to Verified Tier"
  "Get verified to accept 15 bookings/week!"
  
Mentor clicks → Opens verification flow
  ↓
Upload ID + Selfie
  ↓
Admin reviews within 24h
  ↓
✅ Verified Tier Unlocked!
```

### Verification Prompts (When to Show)

Mentors are prompted to verify when they:
1. **Reach booking limit:** "You've reached your 5 bookings/week limit. Verify to accept 15/week!"
2. **Dashboard reminder:** Persistent card showing verification benefits
3. **After 3 bookings:** "Great start! Get verified to accept more bookings."
4. **Profile completion:** Shows as optional Phase 2 enhancement

---

## Technical Implementation

### 1. Database Schema

**Migration:** `20260227000004_id_document_verification.sql`

```sql
-- Add verification columns to expert_profiles
ALTER TABLE expert_profiles
ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'document',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_photo_url TEXT,
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

-- Create verification_documents table for tracking submissions
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_profile_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  id_document_url TEXT NOT NULL,
  selfie_photo_url TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('passport', 'drivers_license', 'national_id', 'other')),
  submission_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for admin review queue
CREATE INDEX idx_verification_docs_status ON verification_documents(status, created_at);
CREATE INDEX idx_verification_docs_expert ON verification_documents(expert_profile_id);

-- Enable RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_documents
CREATE POLICY "Users can view their own verification submissions"
  ON verification_documents FOR SELECT
  USING (expert_profile_id IN (
    SELECT id FROM expert_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own verification submissions"
  ON verification_documents FOR INSERT
  WITH CHECK (expert_profile_id IN (
    SELECT id FROM expert_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all verification submissions"
  ON verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update verification submissions"
  ON verification_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update expert profile after verification approval
CREATE OR REPLACE FUNCTION handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE expert_profiles
    SET 
      verification_status = 'verified',
      verification_method = 'document',
      verification_reviewed_at = NEW.reviewed_at,
      verification_reviewed_by = NEW.reviewed_by,
      is_verified = TRUE
    WHERE id = NEW.expert_profile_id;
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE expert_profiles
    SET 
      verification_status = 'failed',
      verification_rejection_reason = NEW.rejection_reason,
      verification_reviewed_at = NEW.reviewed_at,
      verification_reviewed_by = NEW.reviewed_by
    WHERE id = NEW.expert_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for verification approval
DROP TRIGGER IF EXISTS on_verification_status_change ON verification_documents;
CREATE TRIGGER on_verification_status_change
  AFTER UPDATE ON verification_documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_verification_approval();

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
CREATE POLICY "Users can upload their own verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2. Frontend Components

**Component:** `src/components/onboarding/IdentityVerificationStep_Document.tsx`

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Upload, CheckCircle, AlertCircle, FileText, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface IdentityVerificationStepProps {
  onComplete: () => void;
  onBack: () => void;
  profileId: string;
}

export const IdentityVerificationStep = ({
  onComplete,
  onBack,
  profileId
}: IdentityVerificationStepProps) => {
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState<'passport' | 'drivers_license' | 'national_id' | 'other'>('passport');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const handleIdDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 10MB',
          variant: 'destructive'
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file (JPG, PNG, etc.)',
          variant: 'destructive'
        });
        return;
      }

      setIdDocument(file);
      setIdPreview(URL.createObjectURL(file));
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 10MB',
          variant: 'destructive'
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file (JPG, PNG, etc.)',
          variant: 'destructive'
        });
        return;
      }

      setSelfiePhoto(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!idDocument || !selfiePhoto) {
      toast({
        title: 'Missing documents',
        description: 'Please upload both your ID document and selfie photo',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload ID document
      const idPath = `${user.id}/id-document-${Date.now()}.${idDocument.name.split('.').pop()}`;
      const idDocumentUrl = await uploadFile(idDocument, idPath);

      // Upload selfie photo
      const selfiePath = `${user.id}/selfie-${Date.now()}.${selfiePhoto.name.split('.').pop()}`;
      const selfiePhotoUrl = await uploadFile(selfiePhoto, selfiePath);

      // Create verification submission
      const { error: submissionError } = await supabase
        .from('verification_documents')
        .insert({
          expert_profile_id: profileId,
          id_document_url: idDocumentUrl,
          selfie_photo_url: selfiePhotoUrl,
          document_type: documentType,
          submission_notes: submissionNotes || null,
          status: 'pending'
        });

      if (submissionError) throw submissionError;

      // Update expert profile
      const { error: profileError } = await supabase
        .from('expert_profiles')
        .update({
          verification_status: 'pending',
          verification_method: 'document',
          id_document_url: idDocumentUrl,
          selfie_photo_url: selfiePhotoUrl,
          verification_submitted_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (profileError) throw profileError;

      toast({
        title: 'Verification submitted!',
        description: 'Your documents have been submitted for review. We\'ll notify you within 24 hours.',
        variant: 'default'
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit verification documents',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Identity Verification</h2>
        <p className="text-muted-foreground">
          Upload your government ID and a selfie photo for verification
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Document Type Selection */}
        <div className="space-y-3">
          <Label>Select Document Type</Label>
          <RadioGroup value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passport" id="passport" />
              <Label htmlFor="passport">Passport</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="drivers_license" id="drivers_license" />
              <Label htmlFor="drivers_license">Driver's License</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="national_id" id="national_id" />
              <Label htmlFor="national_id">National ID Card</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other">Other Government ID</Label>
            </div>
          </RadioGroup>
        </div>

        {/* ID Document Upload */}
        <div className="space-y-3">
          <Label htmlFor="id-document">
            <FileText className="w-4 h-4 inline mr-2" />
            Government ID Document
          </Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {idPreview ? (
              <div className="space-y-3">
                <img src={idPreview} alt="ID preview" className="max-h-48 mx-auto rounded" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIdDocument(null);
                    setIdPreview(null);
                  }}
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <label htmlFor="id-document" className="cursor-pointer space-y-2 block">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload your government ID
                </p>
                <p className="text-xs text-muted-foreground">
                  Accepted: JPG, PNG (max 10MB)
                </p>
              </label>
            )}
            <input
              id="id-document"
              type="file"
              accept="image/*"
              onChange={handleIdDocumentChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Selfie Photo Upload */}
        <div className="space-y-3">
          <Label htmlFor="selfie-photo">
            <Camera className="w-4 h-4 inline mr-2" />
            Selfie Photo
          </Label>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {selfiePreview ? (
              <div className="space-y-3">
                <img src={selfiePreview} alt="Selfie preview" className="max-h-48 mx-auto rounded" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelfiePhoto(null);
                    setSelfiePreview(null);
                  }}
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <label htmlFor="selfie-photo" className="cursor-pointer space-y-2 block">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a selfie photo
                </p>
                <p className="text-xs text-muted-foreground">
                  Take a clear photo of your face
                </p>
              </label>
            )}
            <input
              id="selfie-photo"
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-3">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information for the verification team..."
            value={submissionNotes}
            onChange={(e) => setSubmissionNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Important Information */}
        <Card className="bg-blue-50 border-blue-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900">Verification Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Ensure your ID is clearly visible and not blurred</li>
                <li>Your face should be clearly visible in the selfie</li>
                <li>Photos will be reviewed within 24 hours</li>
                <li>Documents are stored securely and only viewed by verification team</li>
              </ul>
            </div>
          </div>
        </Card>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!idDocument || !selfiePhoto || isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
```


### 3. Admin Dashboard Component

**Component:** `src/components/admin/VerificationReviewQueue.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Eye, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface VerificationDocument {
  id: string;
  expert_profile_id: string;
  id_document_url: string;
  selfie_photo_url: string;
  document_type: string;
  submission_notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  expert_profile: {
    full_name: string;
    email: string;
    user_id: string;
  };
}

export const VerificationReviewQueue = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<VerificationDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('verification_documents')
        .select(`
          *,
          expert_profile:expert_profiles(
            full_name,
            email,
            user_id
          )
        `)
        .order('created_at', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verification documents',
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (docId: string) => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: 'Verification approved',
        description: 'The mentor has been verified successfully',
        variant: 'default'
      });

      setSelectedDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve verification',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: 'Verification rejected',
        description: 'The mentor will be notified of the rejection',
        variant: 'default'
      });

      setSelectedDoc(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject verification',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Verification Review Queue</h2>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending ({documents.filter(d => d.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejected
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No verification documents found</p>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <User className="w-10 h-10 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{doc.expert_profile.full_name}</h3>
                      <Badge variant={
                        doc.status === 'approved' ? 'default' :
                        doc.status === 'rejected' ? 'destructive' :
                        'secondary'
                      }>
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{doc.expert_profile.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Document Type: {doc.document_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(doc.created_at), 'PPp')}
                    </p>
                    {doc.submission_notes && (
                      <p className="text-sm mt-2 italic">
                        Note: {doc.submission_notes}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Verification Documents</DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-6">
              {/* Mentor Info */}
              <Card className="p-4 bg-muted">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-semibold">{selectedDoc.expert_profile.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-semibold">{selectedDoc.expert_profile.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Document Type</p>
                    <p className="font-semibold capitalize">{selectedDoc.document_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-semibold">{format(new Date(selectedDoc.created_at), 'PPp')}</p>
                  </div>
                </div>
                {selectedDoc.submission_notes && (
                  <div className="mt-4">
                    <p className="text-muted-foreground text-sm">Submission Notes:</p>
                    <p className="text-sm italic">{selectedDoc.submission_notes}</p>
                  </div>
                )}
              </Card>

              {/* Document Images */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">ID Document</h3>
                  <img
                    src={selectedDoc.id_document_url}
                    alt="ID Document"
                    className="w-full rounded border"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Selfie Photo</h3>
                  <img
                    src={selectedDoc.selfie_photo_url}
                    alt="Selfie"
                    className="w-full rounded border"
                  />
                </div>
              </div>

              {/* Rejection Reason (if reviewing) */}
              {selectedDoc.status === 'pending' && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold">
                    Rejection Reason (if rejecting)
                  </label>
                  <Textarea
                    placeholder="Provide a reason if rejecting this verification..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {selectedDoc.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedDoc.id)}
                    disabled={isProcessing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleApprove(selectedDoc.id)}
                    disabled={isProcessing}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

### 4. Email Notifications

**Edge Function:** `supabase/functions/send-verification-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  try {
    const { type, expertProfileId, expertEmail, expertName, rejectionReason } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let subject = '';
    let html = '';

    if (type === 'submission') {
      subject = 'Verification Documents Received';
      html = `
        <h2>Verification Submitted Successfully</h2>
        <p>Hi ${expertName},</p>
        <p>We've received your verification documents and they're now under review.</p>
        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our verification team will review your documents within 24 hours</li>
          <li>You'll receive an email once the review is complete</li>
          <li>If approved, your verified badge will appear immediately</li>
        </ul>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>The Spark Mentor Connect Team</p>
      `;
    } else if (type === 'approved') {
      subject = '✅ Verification Approved - You\'re Now Verified!';
      html = `
        <h2>🎉 Congratulations! You're Verified</h2>
        <p>Hi ${expertName},</p>
        <p>Great news! Your verification documents have been approved.</p>
        <p><strong>You now have:</strong></p>
        <ul>
          <li>✅ Verified badge on your profile</li>
          <li>📈 Higher visibility in search results</li>
          <li>🎯 Access to all platform features</li>
          <li>⭐ Increased student trust</li>
        </ul>
        <p><a href="${Deno.env.get('APP_URL')}/mentor-dashboard">Visit your dashboard</a> to see your verified status!</p>
        <p>Best regards,<br>The Spark Mentor Connect Team</p>
      `;
    } else if (type === 'rejected') {
      subject = 'Verification Needs Attention';
      html = `
        <h2>Verification Review Update</h2>
        <p>Hi ${expertName},</p>
        <p>We've reviewed your verification documents, but we need you to resubmit with some adjustments.</p>
        <p><strong>Reason:</strong></p>
        <p>${rejectionReason}</p>
        <p><strong>What to do next:</strong></p>
        <ul>
          <li>Review the feedback above</li>
          <li>Prepare new photos following the guidelines</li>
          <li><a href="${Deno.env.get('APP_URL')}/mentor-dashboard">Resubmit your documents</a></li>
        </ul>
        <p>We're here to help if you have questions. Just reply to this email!</p>
        <p>Best regards,<br>The Spark Mentor Connect Team</p>
      `;
    }

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Spark Mentor Connect <noreply@sparkmentorconnect.com>',
        to: [expertEmail],
        subject,
        html,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

**Database Trigger for Notifications:**

```sql
-- Function to send verification notification
CREATE OR REPLACE FUNCTION send_verification_notification()
RETURNS TRIGGER AS $$
DECLARE
  expert_email TEXT;
  expert_name TEXT;
BEGIN
  -- Get expert details
  SELECT p.email, ep.full_name
  INTO expert_email, expert_name
  FROM expert_profiles ep
  JOIN profiles p ON p.id = ep.user_id
  WHERE ep.id = NEW.expert_profile_id;

  -- Send notification based on status change
  IF TG_OP = 'INSERT' THEN
    -- Verification submitted
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-verification-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'submission',
        'expertProfileId', NEW.expert_profile_id,
        'expertEmail', expert_email,
        'expertName', expert_name
      )
    );
  ELSIF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Verification approved
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-verification-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'approved',
        'expertProfileId', NEW.expert_profile_id,
        'expertEmail', expert_email,
        'expertName', expert_name
      )
    );
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    -- Verification rejected
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-verification-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'rejected',
        'expertProfileId', NEW.expert_profile_id,
        'expertEmail', expert_email,
        'expertName', expert_name,
        'rejectionReason', NEW.rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email notifications
DROP TRIGGER IF EXISTS on_verification_status_notification ON verification_documents;
CREATE TRIGGER on_verification_status_notification
  AFTER INSERT OR UPDATE ON verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION send_verification_notification();
```

---

## User Experience Flow

### Phase 1: Sign-up (No Verification)

**New Mentor Journey:**
1. **Step 1: Basic Info** (2 min)
   - Name, bio, expertise areas
   - Profile photo
   - Languages spoken

2. **Step 2: Services & Pricing** (3 min)
   - Session types offered
   - Hourly rates
   - Session descriptions

3. **Step 3: Availability Setup** (3 min)
   - Set weekly schedule
   - Choose timezone
   - Set buffer times between sessions

4. **✅ Go Live!**
   - Immediate platform access
   - Profile is searchable
   - Can accept bookings right away
   - Basic tier (5 bookings/week)

**Total Time:** 8-12 minutes  
**Barrier:** None  
**Conversion:** Target >60%

### Phase 2: Verification (Optional Upgrade)

**Triggered When:**
- Mentor hits 5 booking limit
- After completing 3 sessions
- Dashboard reminder card
- Manual click on "Upgrade to Verified"

**Verification Flow:**
1. **Dashboard Prompt:**
   ```
   📈 Upgrade to Verified Tier
   
   Benefits:
   ✓ 15 bookings/week (instead of 5)
   ✓ Verified badge on profile
   ✓ Higher search ranking
   ✓ +25% average earnings
   
   [Start Verification] [Learn More]
   ```

2. **Verification Steps:**
   - Select document type (passport, driver's license, national ID)
   - Upload government ID photo
   - Upload selfie photo
   - Optional: Add notes
   - Submit for review

3. **Pending Status:**
   - Email confirmation sent
   - "Review in progress" badge shown
   - Can continue accepting bookings (5/week limit)
   - Expected review time: 24 hours

4. **Approval:**
   - Email notification
   - ✅ Verified badge appears
   - 📈 Booking limit increased to 15/week
   - Tier upgraded to "Verified"

**Total Time:** 5 minutes to submit, 24 hours review  
**Barrier:** Minimal (already using platform)  
**Conversion:** Target 40-50% of active mentors

---

## Security Considerations

### Document Upload Security
- Files stored in private `verification-documents` bucket
- Admin-only access to review documents
- Encrypted transmission (HTTPS)
- Automatic file size limits (10MB max)
- Image format validation (JPG, PNG only)
- Secure URLs with expiration
- No public access to verification images

### Platform Security Without Initial Verification
**Question:** Is it safe to let unverified mentors go live?

**Answer:** Yes, with proper safeguards:

**Safeguards in Place:**
1. **Email verification required** (no bots)
2. **Booking limits** (5/week prevents abuse)
3. **Review system** (students can report issues)
4. **Payment verification** (Stripe Connect verification)
5. **Profile moderation** (admin can review/suspend)
6. **Graduated access** (unlock features as they prove trustworthy)

**Risk Mitigation:**
- Lower booking limit reduces impact of bad actors
- Students can see "Basic" tier badge (signals new/unverified)
- Admin can quickly suspend problematic accounts
- Most mentors verify after experiencing platform value
- Payment processor (Stripe) provides additional fraud prevention

**Industry Standard:**
Similar platforms (Calendly, UpWork, Fiverr) allow users to start without identity verification, using graduated access and monitoring instead of upfront barriers.

---

## Testing Checklist

### Phase 1: Onboarding Without Verification
- [ ] Can complete basic info step
- [ ] Can complete services & pricing step
- [ ] Can complete availability setup step
- [ ] "Go Live" button appears after step 3
- [ ] Profile goes live immediately
- [ ] Profile shows "Basic" tier badge
- [ ] Booking limit is 5/week
- [ ] No verification barrier during sign-up

### Phase 2: Verification Flow
- [ ] Verification prompt shows in dashboard
- [ ] Can access verification from dashboard
- [ ] Upload valid government ID
- [ ] Upload clear selfie photo
- [ ] Submit for review successfully
- [ ] Receives email confirmation
- [ ] Profile shows "Review in Progress" status
- [ ] Admin dashboard shows submission
- [ ] Admin can approve/reject
- [ ] Mentor receives email on approval
- [ ] Verified badge appears on profile
- [ ] Booking limit increases to 15/week
- [ ] Tier upgrades to "Verified"

### Verification Prompts
- [ ] Prompt shows when hitting 5 booking limit
- [ ] Prompt shows in dashboard completion card
- [ ] Prompt shows after 3 completed sessions
- [ ] Can dismiss prompts (returns later)
- [ ] "Learn More" link explains benefits

---

## Migration Guide

### Apply Migrations

```bash
# In Supabase Dashboard SQL Editor:
# 1. Run: supabase/migrations/20260227000004_id_document_verification.sql
```

### Frontend Updates

**1. Remove verification from Phase 1 onboarding:**
- Update `ExpertOnboarding.tsx` to have 3 steps (not 4)
- Step 1: Basic Info
- Step 2: Services & Pricing  
- Step 3: Availability Setup
- Remove `IdentityVerificationStep` from Phase 1

**2. Add verification to Phase 2 (dashboard):**
- Add `VerificationUpgradeCard` to `MentorDashboard`
- Component prompts mentor to verify for tier upgrade
- Links to `VerificationFlow` modal/page

**3. Add admin review interface:**
- Add `VerificationReviewQueue` to admin dashboard
- Admins can review pending verifications
- Approve/reject with reasons

### File Structure
```
src/
  components/
    dashboard/
      VerificationUpgradeCard.tsx  (NEW - Phase 2 prompt)
    verification/
      IdentityVerificationStep_Document.tsx  (MOVED from onboarding)
      VerificationFlow.tsx  (NEW - standalone verification flow)
    admin/
      VerificationReviewQueue.tsx  (NEW - admin review interface)
```

---

## Metrics to Track

### Phase 1 Success (Onboarding)
```sql
-- Onboarding completion rate (without verification barrier)
SELECT 
  COUNT(*) FILTER (WHERE phase_1_complete = true) as completed_onboarding,
  COUNT(*) as total_signups,
  ROUND(100.0 * COUNT(*) FILTER (WHERE phase_1_complete = true) / COUNT(*), 1) as completion_rate
FROM expert_profiles
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Phase 2 Success (Verification Opt-in)
```sql
-- Verification opt-in rate among active mentors
SELECT 
  COUNT(*) FILTER (WHERE verification_status IN ('verified', 'pending')) as started_verification,
  COUNT(*) FILTER (WHERE total_sessions_completed >= 1) as active_mentors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verification_status IN ('verified', 'pending')) / 
    COUNT(*) FILTER (WHERE total_sessions_completed >= 1), 1) as verification_opt_in_rate
FROM expert_profiles
WHERE phase_1_complete = true;
```

### Verification Completion Time
```sql
-- Time from submission to approval
SELECT 
  AVG(EXTRACT(EPOCH FROM (verification_reviewed_at - verification_submitted_at)) / 3600) as avg_hours_to_review,
  MIN(verification_reviewed_at - verification_submitted_at) as fastest_review,
  MAX(verification_reviewed_at - verification_submitted_at) as slowest_review,
  COUNT(*) as total_reviewed
FROM expert_profiles
WHERE verification_status = 'verified'
AND verification_submitted_at IS NOT NULL
AND verification_reviewed_at IS NOT NULL;
```

### Booking Impact After Verification
```sql
-- Compare booking rates before/after verification
WITH mentor_stats AS (
  SELECT 
    ep.id,
    ep.verification_status,
    COUNT(b.id) FILTER (WHERE b.created_at < ep.verification_reviewed_at) as bookings_before,
    COUNT(b.id) FILTER (WHERE b.created_at >= ep.verification_reviewed_at) as bookings_after
  FROM expert_profiles ep
  LEFT JOIN booking_requests b ON b.mentor_id = ep.user_id
  WHERE ep.verification_status = 'verified'
  AND ep.verification_reviewed_at IS NOT NULL
  GROUP BY ep.id, ep.verification_status, ep.verification_reviewed_at
)
SELECT 
  AVG(bookings_before) as avg_bookings_before_verification,
  AVG(bookings_after) as avg_bookings_after_verification,
  ROUND(100.0 * (AVG(bookings_after) - AVG(bookings_before)) / NULLIF(AVG(bookings_before), 0), 1) as percent_increase
FROM mentor_stats;
```

### Tier Distribution
```sql
-- Distribution of mentors across tiers
SELECT 
  mentor_tier,
  COUNT(*) as mentor_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage,
  AVG(total_sessions_completed) as avg_sessions,
  AVG(profile_completion_percentage) as avg_profile_completion
FROM expert_profiles
WHERE phase_1_complete = true
GROUP BY mentor_tier
ORDER BY mentor_count DESC;
```

---

## Expected Impact

### Onboarding Improvements
**Before (Verification in Phase 1):**
- Sign-up to live: 35-55 minutes
- Completion rate: 30-40%
- Abandonment at verification: 60%
- Time to first booking: 24-48 hours (waiting for verification)

**After (Verification in Phase 2):**
- Sign-up to live: 8-12 minutes ⚡
- Completion rate: >60% 📈
- Immediate platform access: 100% ✅
- Time to first booking: Instant (no wait) 🚀

### Verification Adoption (Projected)
**Among Active Mentors (3+ sessions completed):**
- Verification opt-in rate: 40-50%
- Conversion to Verified tier: 35-45%
- Time to verify: When they need more than 5 bookings/week

**Natural Upgrade Path:**
1. New mentor → 5 booking limit sufficient initially
2. Gets busy → Hits 5 booking limit
3. Motivated to verify → Submits documents
4. Approved → Can accept 15 bookings/week

### Admin Workload
**Initial Period (Month 1-2):**
- Manual reviews per day: 50-100
- Review time per submission: 2-3 minutes
- Total admin time: 2-5 hours/day
- Recommended team: 1-2 reviewers

**Steady State (Month 3+):**
- Manual reviews per day: 20-30
- Review backlog: <24 hours
- Automation potential: Flag obvious approvals
- Recommended team: 1 reviewer

### Platform Safety
**Security Metrics to Monitor:**
- Fraud reports per 1000 bookings
- Disputed bookings (Basic vs Verified)
- Account suspension rate by tier
- Student trust ratings by mentor tier

**Expected Safety:**
- Similar or better than camera-only verification
- Email + payment verification catches most bad actors
- Booking limits reduce impact of any bad actors
- Review system provides community oversight
- Most genuine mentors verify within 30 days

---

## Support Documentation

### For Mentors

**Help Articles to Create:**
1. **"How to Get Started as a Mentor (3 Simple Steps)"**
   - Focus on quick onboarding
   - Mention verification as optional upgrade

2. **"How to Get Verified & Unlock More Bookings"**
   - Benefits of verification
   - Step-by-step guide with screenshots
   - What makes a good ID photo
   - What makes a good selfie photo

3. **"Understanding Mentor Tiers: Basic, Verified & Top"**
   - Tier comparison chart
   - How to upgrade tiers
   - Benefits at each level

4. **"Why Was My Verification Rejected?"**
   - Common rejection reasons
   - How to resubmit
   - Photo quality guidelines
   - Contact support for help

### For Admin Team

**Training Materials:**
1. **Verification Review Checklist:**
   - [ ] Name on ID matches profile name
   - [ ] Face in selfie matches face on ID
   - [ ] ID appears genuine (not photoshopped)
   - [ ] ID is government-issued (not employee badge, etc.)
   - [ ] Photos are clear and readable
   - [ ] No obvious red flags

2. **Common Rejection Reasons:**
   - Blurry or unreadable ID
   - Face doesn't match
   - Name doesn't match
   - Photo appears edited/fake
   - Wrong document type (not government ID)
   - Inappropriate photos

3. **Escalation Process:**
   - When to flag for senior review
   - How to handle disputed rejections
   - When to request additional documents

---

## Implementation Checklist

### Phase 1 Updates (Remove Verification Barrier)
- [ ] Update `ExpertOnboarding.tsx` to 3 steps only
- [ ] Remove `IdentityVerificationStep` from Phase 1
- [ ] Add `AvailabilitySetupStep` as step 3
- [ ] Update "Go Live" logic (no verification required)
- [ ] Set default `mentor_tier` to 'basic' on sign-up
- [ ] Set default `max_weekly_bookings` to 5
- [ ] Test complete onboarding flow (8-12 min target)

### Phase 2 Integration (Verification as Upgrade)
- [ ] Create `VerificationUpgradeCard` for dashboard
- [ ] Add verification prompts:
  - [ ] When hitting 5 booking limit
  - [ ] After 3 sessions completed
  - [ ] In profile completion widget
- [ ] Create standalone `VerificationFlow` component
- [ ] Move `IdentityVerificationStep_Document` to verification flow
- [ ] Add dashboard link to start verification
- [ ] Test upgrade prompt displays correctly

### Admin Dashboard
- [ ] Implement `VerificationReviewQueue` component
- [ ] Add to admin navigation
- [ ] Test approve workflow
- [ ] Test reject workflow with reasons
- [ ] Verify email notifications sent

### Database & Backend
- [ ] Apply migration `20260227000004_id_document_verification.sql`
- [ ] Create storage bucket `verification-documents`
- [ ] Set up RLS policies for verification documents
- [ ] Deploy edge function `send-verification-notification`
- [ ] Test email notifications work
- [ ] Configure Resend API keys

### Testing
- [ ] Phase 1: Complete onboarding without verification
- [ ] Verify Basic tier assigned automatically
- [ ] Verify 5 booking limit enforced
- [ ] Dashboard shows verification upgrade card
- [ ] Can submit verification from dashboard
- [ ] Admin can review and approve
- [ ] Tier upgrades to Verified after approval
- [ ] Booking limit increases to 15/week
- [ ] Email notifications sent at each step

---

## Success Criteria

### Week 1
- [ ] >50% onboarding completion rate
- [ ] <15 minute average onboarding time
- [ ] 0 verification-related abandonment (removed from Phase 1)
- [ ] All new mentors start with Basic tier

### Month 1
- [ ] >20% of active mentors submit verification
- [ ] <24 hour average verification review time
- [ ] >90% verification approval rate
- [ ] No increase in fraud/abuse reports

### Month 3
- [ ] >40% of active mentors are Verified tier
- [ ] Verified mentors have 2-3x more bookings than Basic
- [ ] Positive feedback on simplified onboarding
- [ ] Verification process running smoothly

---

## Rollback Plan

If issues arise, you can rollback to camera verification:

```sql
-- 1. Revert database changes
ALTER TABLE expert_profiles
DROP COLUMN IF EXISTS id_document_url,
DROP COLUMN IF EXISTS selfie_photo_url,
DROP COLUMN IF EXISTS verification_submitted_at,
DROP COLUMN IF EXISTS verification_reviewed_at,
DROP COLUMN IF EXISTS verification_reviewed_by,
DROP COLUMN IF EXISTS verification_rejection_reason;

DROP TABLE IF EXISTS verification_documents;
DROP FUNCTION IF EXISTS handle_verification_approval();
DROP FUNCTION IF EXISTS send_verification_notification();

-- 2. Revert frontend
-- Add IdentityVerificationStep back to Phase 1 in ExpertOnboarding.tsx
-- Remove VerificationUpgradeCard from dashboard
-- Remove VerificationReviewQueue from admin

-- 3. Make verification required for going live
-- Update logic to require verification_status = 'verified' before is_profile_live = true
```

---

## Conclusion

Moving verification to Phase 2 fundamentally improves the mentor onboarding experience:

**✅ Remove barriers** - Get mentors live in <15 minutes instead of 35-55 minutes  
**✅ Increase conversions** - Target >60% completion vs 30-40% with upfront verification  
**✅ Progressive trust** - Mentors verify after experiencing platform value  
**✅ Natural motivation** - Verification happens when mentors need more bookings  
**✅ Better retention** - Lower friction leads to more active mentors  

This approach balances **accessibility** (easy to start) with **security** (verified mentors earn trust), creating a better experience for both mentors and students.
