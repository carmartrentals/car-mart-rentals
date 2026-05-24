"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Save, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import { AiDescriptionField } from "@/components/admin/ai-description-field";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { VinDecoderButton } from "@/components/admin/vin-decoder-button";
import { initialActionState, type ActionState } from "@/lib/form";
import { VEHICLE_CATEGORIES, FUEL_TYPES, VEHICLE_STATUS } from "@/lib/constants";
import type { Vehicle } from "@/lib/types/database";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function VehicleForm({
  action,
  vehicle,
  galleryUrls,
}: {
  action: Action;
  vehicle?: Vehicle;
  galleryUrls?: string[];
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const isEdit = !!vehicle;
  const err = (f: string) => state.fieldErrors?.[f]?.[0];

  // Photo state — main image + gallery — uploaded as real files via PhotoUpload.
  const [mainImage, setMainImage] = useState<string>(vehicle?.main_image_url ?? "");
  const [gallery, setGallery] = useState<string[]>(galleryUrls ?? []);
  // Combined list lets the user pick any uploaded shot as the main one.
  const allPhotos = [mainImage, ...gallery].filter(Boolean);
  function handlePhotoChange(next: string[]) {
    if (next.length === 0) {
      setMainImage("");
      setGallery([]);
      return;
    }
    // If the user removed the current main, promote the first remaining shot.
    if (!next.includes(mainImage)) {
      setMainImage(next[0]);
      setGallery(next.slice(1));
    } else {
      setMainImage(mainImage || next[0]);
      setGallery(next.filter((u) => u !== (mainImage || next[0])));
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Vehicle saved successfully.</Alert>}

      {/* IDENTITY */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Identity</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Year" required error={err("year")}>
            <Input name="year" type="number" defaultValue={vehicle?.year ?? 2025} />
          </Field>
          <Field label="Make" required error={err("make")}>
            <Input name="make" defaultValue={vehicle?.make} placeholder="Mercedes-Benz" />
          </Field>
          <Field label="Model" required error={err("model")}>
            <Input name="model" defaultValue={vehicle?.model} placeholder="S500" />
          </Field>
          <Field label="Trim" error={err("trim")}>
            <Input name="trim" defaultValue={vehicle?.trim ?? ""} placeholder="4MATIC" />
          </Field>
          <Field label="Color" error={err("color")}>
            <Input name="color" defaultValue={vehicle?.color ?? ""} />
          </Field>
          <Field
            label="VIN"
            hint="Type or paste the 17-character VIN, then click Auto-fill to populate everything else."
            error={err("vin")}
          >
            <Input name="vin" defaultValue={vehicle?.vin ?? ""} />
            <VinDecoderButton />
          </Field>
          <Field label="License Plate" error={err("license_plate")}>
            <Input name="license_plate" defaultValue={vehicle?.license_plate ?? ""} />
          </Field>
          <Field label="GPS Device ID" error={err("gps_device_id")}>
            <Input name="gps_device_id" defaultValue={vehicle?.gps_device_id ?? ""} />
          </Field>
        </CardBody>
      </Card>

      {/* CLASSIFICATION */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Category" required error={err("category")}>
            <Select name="category" defaultValue={vehicle?.category ?? "sedan"}>
              {Object.entries(VEHICLE_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fuel Type" required error={err("fuel_type")}>
            <Select name="fuel_type" defaultValue={vehicle?.fuel_type ?? "gasoline"}>
              {Object.entries(FUEL_TYPES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Transmission" required error={err("transmission")}>
            <Select name="transmission" defaultValue={vehicle?.transmission ?? "automatic"}>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </Select>
          </Field>
          <Field label="Seats" required error={err("seats")}>
            <Input name="seats" type="number" defaultValue={vehicle?.seats ?? 5} />
          </Field>
          <Field label="Doors" required error={err("doors")}>
            <Input name="doors" type="number" defaultValue={vehicle?.doors ?? 4} />
          </Field>
          <Field label="Odometer (mi)" error={err("odometer")}>
            <Input name="odometer" type="number" defaultValue={vehicle?.odometer ?? 0} />
          </Field>
        </CardBody>
      </Card>

      {/* PRICING */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Daily Rate ($)" required error={err("daily_rate")}>
            <Input name="daily_rate" type="number" step="0.01" defaultValue={vehicle?.daily_rate ?? ""} />
          </Field>
          <Field label="Weekend Rate ($)" error={err("weekend_rate")}>
            <Input name="weekend_rate" type="number" step="0.01" defaultValue={vehicle?.weekend_rate ?? ""} />
          </Field>
          <Field label="Weekly Rate ($)" error={err("weekly_rate")}>
            <Input name="weekly_rate" type="number" step="0.01" defaultValue={vehicle?.weekly_rate ?? ""} />
          </Field>
          <Field label="Monthly Rate ($)" error={err("monthly_rate")}>
            <Input name="monthly_rate" type="number" step="0.01" defaultValue={vehicle?.monthly_rate ?? ""} />
          </Field>
          <Field label="Security Deposit ($)" required error={err("security_deposit")}>
            <Input name="security_deposit" type="number" step="0.01" defaultValue={vehicle?.security_deposit ?? ""} />
          </Field>
          <Field label="Cleaning Fee ($)" error={err("cleaning_fee")}>
            <Input name="cleaning_fee" type="number" step="0.01" defaultValue={vehicle?.cleaning_fee ?? 0} />
          </Field>
          <Field label="Late Fee ($/hr)" error={err("late_fee")}>
            <Input name="late_fee" type="number" step="0.01" defaultValue={vehicle?.late_fee ?? 0} />
          </Field>
          <Field label="Smoking Fee ($)" error={err("smoking_fee")}>
            <Input name="smoking_fee" type="number" step="0.01" defaultValue={vehicle?.smoking_fee ?? 0} />
          </Field>
        </CardBody>
      </Card>

      {/* POLICIES */}
      <Card>
        <CardHeader>
          <CardTitle>Mileage & Policies</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mileage Limit (mi/day)" hint="0 = unlimited" error={err("mileage_limit")}>
            <Input name="mileage_limit" type="number" defaultValue={vehicle?.mileage_limit ?? 200} />
          </Field>
          <Field label="Extra Mileage Fee ($/mi)" error={err("extra_mileage_fee")}>
            <Input name="extra_mileage_fee" type="number" step="0.01" defaultValue={vehicle?.extra_mileage_fee ?? 0} />
          </Field>
          <Field label="Fuel Policy" error={err("fuel_policy")}>
            <Input name="fuel_policy" defaultValue={vehicle?.fuel_policy ?? "Return with same fuel level"} />
          </Field>
          <Field label="Registration Expiration" error={err("registration_expiration")}>
            <Input name="registration_expiration" type="date" defaultValue={vehicle?.registration_expiration ?? ""} />
          </Field>
          <Field label="Insurance Expiration" error={err("insurance_expiration")}>
            <Input name="insurance_expiration" type="date" defaultValue={vehicle?.insurance_expiration ?? ""} />
          </Field>
        </CardBody>
      </Card>

      {/* MEDIA & DETAILS */}
      <Card>
        <CardHeader>
          <CardTitle>Photos & Description</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4">
          {/* Hidden inputs feed the existing server action — main image first, gallery after. */}
          <input type="hidden" name="main_image_url" value={mainImage} />
          <input
            type="hidden"
            name="gallery_urls"
            value={gallery.join("\n")}
          />

          <div>
            <PhotoUpload
              label="Vehicle Photos"
              bucket="vehicle-photos"
              folder={vehicle?.id ? `${vehicle.id}` : "new"}
              urls={allPhotos}
              onChange={handlePhotoChange}
              max={20}
            />
            {allPhotos.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                The first photo is shown as the main image on the website. Click
                a thumbnail below to make it the main image.
              </p>
            )}
            {allPhotos.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allPhotos.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setMainImage(url);
                      setGallery(allPhotos.filter((u) => u !== url));
                    }}
                    className={`relative h-14 w-20 overflow-hidden rounded-md border-2 transition-colors ${
                      url === mainImage
                        ? "border-gold-500"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    title={
                      url === mainImage ? "Main image" : "Make this the main image"
                    }
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <span className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">
                      {url === mainImage ? (
                        <Star className="h-3 w-3 fill-current" />
                      ) : (
                        <StarOff className="h-3 w-3" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {state.fieldErrors?.main_image_url && (
              <p className="mt-1.5 text-xs text-rose-600">
                {state.fieldErrors.main_image_url[0]}
              </p>
            )}
          </div>

          <Field label="Features" hint="One feature per line, or comma-separated">
            <Textarea name="features" rows={3}
              defaultValue={vehicle?.features.join("\n") ?? ""}
              placeholder={"Panoramic Roof\nHeated Seats\nApple CarPlay"} />
          </Field>
          <Field label="Public Description" error={err("description")}>
            <AiDescriptionField defaultValue={vehicle?.description ?? ""} />
          </Field>
        </CardBody>
      </Card>

      {/* STATUS */}
      <Card>
        <CardHeader>
          <CardTitle>Status & Internal</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" required error={err("status")}>
            <Select name="status" defaultValue={vehicle?.status ?? "available"}>
              {Object.entries(VEHICLE_STATUS).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2.5 pt-7">
            <input type="checkbox" name="is_featured" defaultChecked={vehicle?.is_featured}
              className="h-4 w-4 rounded border-slate-300 text-gold-500 focus:ring-gold-500" />
            <span className="text-sm text-slate-700">
              Feature this vehicle on the website home page
            </span>
          </label>
          <Field label="Internal Notes" className="sm:col-span-2" error={err("internal_notes")}>
            <Textarea name="internal_notes" rows={3} defaultValue={vehicle?.internal_notes ?? ""} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href={isEdit ? `/admin/vehicles/${vehicle!.id}` : "/admin/vehicles"}>
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit" loading={pending}>
          <Save className="h-4 w-4" />
          {isEdit ? "Save Changes" : "Create Vehicle"}
        </Button>
      </div>
    </form>
  );
}
