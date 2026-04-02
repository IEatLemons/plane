# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from zxcvbn import zxcvbn

# Module imports
from plane.db.models import User
from plane.license.api.views.base import BaseAPIView


class InstanceUserPasswordResetEndpoint(BaseAPIView):
    """Allow instance admins to set a new password for a user by email (no old password)."""

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        new_password = request.data.get("new_password", False)

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:
            return Response(
                {"error": "New password is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        if user is None or user.is_bot:
            return Response(
                {"error": "Unable to reset password. Check the email address and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = zxcvbn(new_password)
        if results["score"] < 3:
            return Response(
                {"error": "Password is too weak. Use a stronger password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.is_password_autoset = False
        user.save()

        return Response(
            {"id": str(user.id), "email": user.email},
            status=status.HTTP_200_OK,
        )
