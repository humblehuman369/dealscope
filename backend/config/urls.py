"""URL configuration for dealscope backend."""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/assumptions/", include("app.assumptions.urls")),
]
