from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include([
        path('auth/', include('apps.accounts.urls')),
        path('', include('apps.courses.urls')),
        path('', include('apps.curriculum.urls')),
        path('', include('apps.assessments.urls')),
        path('', include('apps.progress.urls')),
    ])),
    # API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # SPA catch-all: serve index.html for any route not matched above
    # This lets React Router handle client-side routing on page refresh
    def spa_fallback(request, path=''):
        index_file = settings.WHITENOISE_ROOT / 'index.html'
        return FileResponse(open(index_file, 'rb'), content_type='text/html')

    urlpatterns += [
        re_path(r'^(?!api/|admin/|static/).*$', spa_fallback),
    ]
