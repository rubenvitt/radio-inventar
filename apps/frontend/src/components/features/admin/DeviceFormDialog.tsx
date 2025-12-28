import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DEVICE_FIELD_LIMITS, CreateDeviceSchema, UpdateDeviceSchema, type Device, type CreateDevice, type UpdateDevice } from '@radio-inventar/shared';
import { useCreateDevice, useUpdateDevice, getDeviceErrorMessage } from '@/api/admin-devices';

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | undefined;
}

interface FormData {
  rufname: string;
  seriennummer: string;
  geraetetyp: string;
  notizen: string;
}

interface FieldErrors {
  rufname?: string;
  seriennummer?: string;
  geraetetyp?: string;
  notizen?: string;
}

export function DeviceFormDialog({ open, onOpenChange, device }: DeviceFormDialogProps) {
  const isEditMode = !!device;
  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();

  const [formData, setFormData] = useState<FormData>({
    rufname: '',
    seriennummer: '',
    geraetetyp: '',
    notizen: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Pre-fill form in edit mode
  useEffect(() => {
    if (open && device) {
      setFormData({
        rufname: device.callSign,
        seriennummer: device.serialNumber || '',
        geraetetyp: device.deviceType,
        notizen: device.notes || '',
      });
      setFieldErrors({});
    } else if (open && !device) {
      // Reset form for create mode
      setFormData({
        rufname: '',
        seriennummer: '',
        geraetetyp: '',
        notizen: '',
      });
      setFieldErrors({});
    }
  }, [open, device]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    // HIGH FIX #6: Don't sanitize during input - let user type freely
    // Sanitization only needed for display (e.g., toasts), not for input
    // Server-side validation will reject actual XSS attacks
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on input change
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  // HIGH FIX #4: Real-time validation on blur for better UX
  const handleBlur = useCallback((field: keyof FormData) => {
    const value = formData[field];
    const trimmedValue = value.trim();

    // Validate individual field
    if (field === 'rufname') {
      if (!trimmedValue || trimmedValue.length === 0) {
        setFieldErrors(prev => ({ ...prev, rufname: 'Rufname ist erforderlich' }));
      } else if (trimmedValue.length > DEVICE_FIELD_LIMITS.CALL_SIGN_MAX) {
        setFieldErrors(prev => ({ ...prev, rufname: `Maximal ${DEVICE_FIELD_LIMITS.CALL_SIGN_MAX} Zeichen erlaubt` }));
      } else {
        setFieldErrors(prev => ({ ...prev, rufname: '' }));
      }
    } else if (field === 'geraetetyp') {
      if (!trimmedValue || trimmedValue.length === 0) {
        setFieldErrors(prev => ({ ...prev, geraetetyp: 'Gerätetyp ist erforderlich' }));
      } else if (trimmedValue.length > DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX) {
        setFieldErrors(prev => ({ ...prev, geraetetyp: `Maximal ${DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX} Zeichen erlaubt` }));
      } else {
        setFieldErrors(prev => ({ ...prev, geraetetyp: '' }));
      }
    } else if (field === 'seriennummer') {
      if (trimmedValue.length > DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX) {
        setFieldErrors(prev => ({ ...prev, seriennummer: `Maximal ${DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX} Zeichen erlaubt` }));
      } else {
        setFieldErrors(prev => ({ ...prev, seriennummer: '' }));
      }
    } else if (field === 'notizen') {
      if (trimmedValue.length > DEVICE_FIELD_LIMITS.NOTES_MAX) {
        setFieldErrors(prev => ({ ...prev, notizen: `Maximal ${DEVICE_FIELD_LIMITS.NOTES_MAX} Zeichen erlaubt` }));
      } else {
        setFieldErrors(prev => ({ ...prev, notizen: '' }));
      }
    }
  }, [formData]);

  // HIGH #3: Use useMemo for trimmed values to avoid duplicate trim operations
  const trimmedFormData = useMemo(() => ({
    rufname: formData.rufname.trim(),
    seriennummer: formData.seriennummer.trim(),
    geraetetyp: formData.geraetetyp.trim(),
    notizen: formData.notizen.trim(),
  }), [formData]);

  // Helper to prepare form data with trimming applied once (Fix #5: Performance)
  const prepareFormData = (): { createData: CreateDevice; updateData: UpdateDevice } => {
    return {
      createData: {
        callSign: trimmedFormData.rufname,
        serialNumber: trimmedFormData.seriennummer || null,
        deviceType: trimmedFormData.geraetetyp,
        notes: trimmedFormData.notizen || null,
      },
      updateData: {
        callSign: trimmedFormData.rufname || undefined,
        serialNumber: trimmedFormData.seriennummer || null,
        deviceType: trimmedFormData.geraetetyp || undefined,
        notes: trimmedFormData.notizen || null,
      },
    };
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Map Zod schema field names to form field names
    // ARCHITECTURE FIX #3: Type-safe field mapping using satisfies
    const fieldNameMap = {
      callSign: 'rufname',
      serialNumber: 'seriennummer',
      deviceType: 'geraetetyp',
      notes: 'notizen',
    } satisfies Record<keyof CreateDevice, keyof FieldErrors>;

    // Fix #5: Use prepareFormData() helper to avoid duplicate trim() calls
    const { createData, updateData } = prepareFormData();

    if (isEditMode) {
      const result = UpdateDeviceSchema.safeParse(updateData);
      if (!result.success) {
        // CRITICAL FIX #6: Ensure errors array exists before iterating
        if (result.error?.errors && result.error.errors.length > 0) {
          result.error.errors.forEach(err => {
            const schemaField = err.path[0] as keyof CreateDevice;
            const formField = fieldNameMap[schemaField] || (schemaField as keyof FieldErrors);
            errors[formField] = err.message;
          });
        } else {
          // HIGH FIX #3: Silent Zod validation failures - show field-level errors
          errors.rufname = 'Bitte überprüfen Sie dieses Feld';
          errors.geraetetyp = 'Bitte überprüfen Sie dieses Feld';
          toast.error('Validierung fehlgeschlagen. Bitte prüfen Sie die markierten Felder.');
          setFieldErrors(errors);
          return false;
        }
      }
    } else {
      const result = CreateDeviceSchema.safeParse(createData);
      if (!result.success) {
        // CRITICAL FIX #6: Ensure errors array exists before iterating
        if (result.error?.errors && result.error.errors.length > 0) {
          result.error.errors.forEach(err => {
            const schemaField = err.path[0] as keyof CreateDevice;
            const formField = fieldNameMap[schemaField] || (schemaField as keyof FieldErrors);
            errors[formField] = err.message;
          });
        } else {
          // HIGH FIX #3: Silent Zod validation failures - show field-level errors
          errors.rufname = 'Bitte überprüfen Sie dieses Feld';
          errors.geraetetyp = 'Bitte überprüfen Sie dieses Feld';
          toast.error('Validierung fehlgeschlagen. Bitte prüfen Sie die markierten Felder.');
          setFieldErrors(errors);
          return false;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Fix #5: Use prepareFormData() helper to avoid duplicate trim() calls
    const { createData, updateData } = prepareFormData();

    try {
      if (isEditMode) {
        await updateDeviceMutation.mutateAsync({
          id: device.id,
          data: updateData,
        });

        // CRITICAL FIX #1: Include device name in success toast
        // HIGH FIX #10: Removed sanitization - toast library (Sonner) is XSS-safe by default
        toast.success(`Gerät "${formData.rufname}" erfolgreich aktualisiert`);
      } else {
        await createDeviceMutation.mutateAsync(createData);

        // CRITICAL FIX #1: Include device name in success toast
        // HIGH FIX #10: Removed sanitization - toast library (Sonner) is XSS-safe by default
        toast.success(`Gerät "${formData.rufname}" erfolgreich erstellt`);
      }

      onOpenChange(false);
    } catch (error) {
      // FIX MEDIUM #4: Mutation errors handled inline with toast + retry
      // Error Boundary is NOT used here because:
      // 1. This is a user action (create/update), not a page-level failure
      // 2. User should stay in dialog to correct input
      // 3. Retry action allows immediate re-submission
      // MEDIUM #7: Use context-aware error message
      const errorMessage = getDeviceErrorMessage(error, isEditMode ? 'update' : 'create');
      toast.error(errorMessage, {
        duration: 5000,
        action: {
          label: 'Erneut versuchen',
          onClick: () => {
            const isPending = createDeviceMutation.isPending || updateDeviceMutation.isPending;
            if (!isPending) {
              const formElement = document.querySelector('form');
              if (formElement) {
                formElement.requestSubmit();
              }
            }
          },
        },
      });
    }
  };

  const isSubmitting = createDeviceMutation.isPending || updateDeviceMutation.isPending;
  const notizenLength = formData.notizen.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Gerät bearbeiten' : 'Neues Gerät'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Bearbeiten Sie die Geräteinformationen.'
              : 'Erstellen Sie ein neues Gerät im Inventar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Rufname field */}
            <div className="grid gap-2">
              <Label htmlFor="rufname">
                Rufname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rufname"
                value={formData.rufname}
                onChange={(e) => handleInputChange('rufname', e.target.value)}
                onBlur={() => handleBlur('rufname')}
                maxLength={DEVICE_FIELD_LIMITS.CALL_SIGN_MAX}
                aria-invalid={!!fieldErrors.rufname}
                aria-describedby={fieldErrors.rufname ? 'rufname-error' : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.rufname && (
                <p id="rufname-error" className="text-sm text-destructive">
                  {fieldErrors.rufname}
                </p>
              )}
            </div>

            {/* Seriennummer field */}
            <div className="grid gap-2">
              <Label htmlFor="seriennummer">Seriennummer</Label>
              <Input
                id="seriennummer"
                value={formData.seriennummer}
                onChange={(e) => handleInputChange('seriennummer', e.target.value)}
                onBlur={() => handleBlur('seriennummer')}
                maxLength={DEVICE_FIELD_LIMITS.SERIAL_NUMBER_MAX}
                aria-invalid={!!fieldErrors.seriennummer}
                aria-describedby={fieldErrors.seriennummer ? 'seriennummer-error' : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.seriennummer && (
                <p id="seriennummer-error" className="text-sm text-destructive">
                  {fieldErrors.seriennummer}
                </p>
              )}
            </div>

            {/* Gerätetyp field */}
            <div className="grid gap-2">
              <Label htmlFor="geraetetyp">
                Gerätetyp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="geraetetyp"
                value={formData.geraetetyp}
                onChange={(e) => handleInputChange('geraetetyp', e.target.value)}
                onBlur={() => handleBlur('geraetetyp')}
                maxLength={DEVICE_FIELD_LIMITS.DEVICE_TYPE_MAX}
                aria-invalid={!!fieldErrors.geraetetyp}
                aria-describedby={fieldErrors.geraetetyp ? 'geraetetyp-error' : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.geraetetyp && (
                <p id="geraetetyp-error" className="text-sm text-destructive">
                  {fieldErrors.geraetetyp}
                </p>
              )}
            </div>

            {/* Notizen field */}
            <div className="grid gap-2">
              <div className="flex justify-between">
                <Label htmlFor="notizen">Notizen</Label>
                <span className="text-sm text-muted-foreground">
                  {notizenLength}/{DEVICE_FIELD_LIMITS.NOTES_MAX}
                </span>
              </div>
              <Textarea
                id="notizen"
                value={formData.notizen}
                onChange={(e) => handleInputChange('notizen', e.target.value)}
                onBlur={() => handleBlur('notizen')}
                maxLength={DEVICE_FIELD_LIMITS.NOTES_MAX}
                rows={3}
                aria-invalid={!!fieldErrors.notizen}
                aria-describedby={fieldErrors.notizen ? 'notizen-error' : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.notizen && (
                <p id="notizen-error" className="text-sm text-destructive">
                  {fieldErrors.notizen}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-h-16"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-16"
            >
              {isSubmitting ? 'Speichert...' : isEditMode ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
