/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { E_PASSWORD_STRENGTH } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { InstanceService } from "@plane/services";
import { Input, PasswordStrengthIndicator } from "@plane/ui";
import { getPasswordStrength } from "@plane/utils";
import { PageWrapper } from "@/components/common/page-wrapper";
import type { Route } from "./+types/page";

type FormValues = {
  email: string;
  new_password: string;
  confirm_password: string;
};

const defaultValues: FormValues = {
  email: "",
  new_password: "",
  confirm_password: "",
};

const instanceService = new InstanceService();

const UserPasswordResetPage = observer(function UserPasswordResetPage(_props: Route.ComponentProps) {
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const email = watch("email");
  const password = watch("new_password");
  const confirmPassword = watch("confirm_password");

  const isButtonDisabled =
    email.trim() === "" ||
    getPasswordStrength(password) !== E_PASSWORD_STRENGTH.STRENGTH_VALID ||
    password.trim() === "" ||
    confirmPassword.trim() === "" ||
    password !== confirmPassword;

  const passwordSupport =
    password.length > 0 && getPasswordStrength(password) !== E_PASSWORD_STRENGTH.STRENGTH_VALID ? (
      <PasswordStrengthIndicator password={password} isFocused={isPasswordFocused} />
    ) : null;

  const onSubmit = async (formData: FormValues) => {
    try {
      await instanceService.resetUserPassword({
        email: formData.email.trim(),
        new_password: formData.new_password,
      });
      reset(defaultValues);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Password updated",
        message: "The user can sign in with the new password.",
      });
    } catch (err: unknown) {
      const data = err as { error?: string };
      const message = typeof data?.error === "string" ? data.error : "Could not reset the password. Please try again.";
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Reset failed",
        message,
      });
    }
  };

  return (
    <PageWrapper
      header={{
        title: "Reset user password",
        description:
          "Set a new password for a user by their verified email. Use when email reset is unavailable or the user forgot their password. The new password must meet the same strength rules as normal sign-up.",
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-7">
        <div className="flex flex-col gap-y-2">
          <label htmlFor="reset-email" className="text-13 text-primary">
            User email
          </label>
          <Controller
            control={control}
            name="email"
            rules={{ required: "Email is required" }}
            render={({ field: { value, onChange } }) => (
              <Input
                id="reset-email"
                type="email"
                value={value}
                onChange={onChange}
                placeholder="user@example.com"
                hasError={Boolean(errors.email)}
                autoComplete="off"
              />
            )}
          />
          {errors.email && <span className="text-11 text-danger-primary">{errors.email.message}</span>}
        </div>

        <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <label htmlFor="reset-new-password" className="text-13 text-primary">
              New password
            </label>
            <div className="relative flex items-center rounded-md">
              <Controller
                control={control}
                name="new_password"
                rules={{ required: "New password is required" }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    id="reset-new-password"
                    type={showPassword.password ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    className="w-full"
                    hasError={Boolean(errors.new_password)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    autoComplete="new-password"
                  />
                )}
              />
              {showPassword.password ? (
                <EyeOff
                  className="absolute right-3 h-5 w-5 stroke-placeholder hover:cursor-pointer"
                  onClick={() => setShowPassword((p) => ({ ...p, password: !p.password }))}
                />
              ) : (
                <Eye
                  className="absolute right-3 h-5 w-5 stroke-placeholder hover:cursor-pointer"
                  onClick={() => setShowPassword((p) => ({ ...p, password: !p.password }))}
                />
              )}
            </div>
            {passwordSupport}
            {errors.new_password && <span className="text-11 text-danger-primary">{errors.new_password.message}</span>}
          </div>

          <div className="flex flex-col gap-y-2">
            <label htmlFor="reset-confirm-password" className="text-13 text-primary">
              Confirm password
            </label>
            <div className="relative flex items-center rounded-md">
              <Controller
                control={control}
                name="confirm_password"
                rules={{ required: "Confirm password is required" }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    id="reset-confirm-password"
                    type={showPassword.confirmPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    className="w-full"
                    hasError={Boolean(errors.confirm_password)}
                    autoComplete="new-password"
                  />
                )}
              />
              {showPassword.confirmPassword ? (
                <EyeOff
                  className="absolute right-3 h-5 w-5 stroke-placeholder hover:cursor-pointer"
                  onClick={() => setShowPassword((p) => ({ ...p, confirmPassword: !p.confirmPassword }))}
                />
              ) : (
                <Eye
                  className="absolute right-3 h-5 w-5 stroke-placeholder hover:cursor-pointer"
                  onClick={() => setShowPassword((p) => ({ ...p, confirmPassword: !p.confirmPassword }))}
                />
              )}
            </div>
            {!!confirmPassword && password !== confirmPassword && (
              <span className="text-13 text-danger-primary">Passwords do not match</span>
            )}
            {errors.confirm_password && (
              <span className="text-11 text-danger-primary">{errors.confirm_password.message}</span>
            )}
          </div>
        </div>

        <div>
          <Button variant="primary" size="xl" type="submit" loading={isSubmitting} disabled={isButtonDisabled}>
            Reset password
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "User Passwords - God Mode" }];

export default UserPasswordResetPage;
