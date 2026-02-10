# views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone

from .models import (
    AssumptionCategory, DefaultAssumption, AssumptionAuditLog,
    FormulaCategory, FormulaGlossary
)
from .serializers import (
    AssumptionCategoryDetailSerializer, DefaultAssumptionSerializer,
    AssumptionUpdateSerializer, BulkAssumptionUpdateSerializer,
    AuditLogSerializer, FormulaCategoryDetailSerializer,
    FormulaGlossarySerializer
)


class IsSuperAdmin(permissions.BasePermission):
    """Only super admins can edit assumptions"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_staff
        return request.user.is_superuser


class IsAdminReadOnly(permissions.BasePermission):
    """Admins can read, super admins can write"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_staff
        return request.user.is_superuser


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class AssumptionCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for assumption categories with nested assumptions"""
    queryset = AssumptionCategory.objects.prefetch_related(
        'assumptions'
    ).all()
    serializer_class = AssumptionCategoryDetailSerializer
    permission_classes = [IsAdminReadOnly]
    lookup_field = 'slug'


class DefaultAssumptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for default assumptions.
    - GET: All admins
    - PUT/PATCH: Super admins only
    """
    queryset = DefaultAssumption.objects.select_related(
        'category', 'updated_by'
    ).all()
    serializer_class = DefaultAssumptionSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        
        # Filter by data type
        data_type = self.request.query_params.get('data_type')
        if data_type:
            qs = qs.filter(data_type=data_type)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(label__icontains=search) |
                Q(key__icontains=search) |
                Q(description__icontains=search)
            )
        
        # Active only
        active_only = self.request.query_params.get('active_only', 'true')
        if active_only.lower() == 'true':
            qs = qs.filter(is_active=True)
        
        return qs

    @action(detail=True, methods=['put'], url_path='update-value')
    def update_value(self, request, pk=None):
        """Update a single assumption's value with audit logging"""
        assumption = self.get_object()
        
        if assumption.is_locked and not request.user.is_superuser:
            return Response(
                {'error': 'This assumption is locked and requires super admin access'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AssumptionUpdateSerializer(
            data=request.data,
            context={'assumption': assumption}
        )
        serializer.is_valid(raise_exception=True)

        old_value = assumption.value
        new_value = serializer.validated_data['value']

        if old_value != new_value:
            # Create audit log
            AssumptionAuditLog.objects.create(
                assumption=assumption,
                changed_by=request.user,
                old_value=old_value,
                new_value=new_value,
                change_reason=serializer.validated_data.get('change_reason', ''),
                ip_address=get_client_ip(request)
            )

            # Update assumption
            assumption.value = new_value
            assumption.updated_by = request.user
            assumption.save()

        return Response(
            DefaultAssumptionSerializer(assumption).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['put'], url_path='bulk-update')
    def bulk_update_values(self, request):
        """Bulk update multiple assumptions"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Super admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BulkAssumptionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updates = serializer.validated_data['updates']
        change_reason = serializer.validated_data.get('change_reason', '')
        results = []
        errors = []

        with transaction.atomic():
            for item in updates:
                try:
                    assumption = DefaultAssumption.objects.get(id=item['id'])
                    old_value = assumption.value
                    new_value = str(item['value'])

                    if old_value != new_value:
                        AssumptionAuditLog.objects.create(
                            assumption=assumption,
                            changed_by=request.user,
                            old_value=old_value,
                            new_value=new_value,
                            change_reason=change_reason,
                            ip_address=get_client_ip(request)
                        )
                        assumption.value = new_value
                        assumption.updated_by = request.user
                        assumption.save()
                        results.append({
                            'id': assumption.id,
                            'key': assumption.key,
                            'status': 'updated'
                        })
                except DefaultAssumption.DoesNotExist:
                    errors.append({
                        'id': item['id'],
                        'error': 'Assumption not found'
                    })
                except Exception as e:
                    errors.append({
                        'id': item['id'],
                        'error': str(e)
                    })

        return Response({
            'updated': results,
            'errors': errors,
            'total_updated': len(results),
            'total_errors': len(errors)
        })

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """Get audit history for a specific assumption"""
        assumption = self.get_object()
        logs = assumption.audit_logs.select_related('changed_by').all()[:50]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='reset-to-defaults')
    def reset_to_defaults(self, request):
        """Reset all assumptions to factory defaults (requires super admin)"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Super admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Implementation would load from a fixtures file
        return Response({'message': 'Reset functionality placeholder'})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Global audit log view"""
    queryset = AssumptionAuditLog.objects.select_related(
        'assumption', 'changed_by'
    ).all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(changed_by_id=user_id)

        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            qs = qs.filter(timestamp__gte=from_date)
        if to_date:
            qs = qs.filter(timestamp__lte=to_date)

        # Filter by assumption
        assumption_id = self.request.query_params.get('assumption')
        if assumption_id:
            qs = qs.filter(assumption_id=assumption_id)

        return qs


class FormulaGlossaryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for formula glossary"""
    queryset = FormulaGlossary.objects.select_related(
        'category'
    ).prefetch_related('related_assumptions').filter(is_active=True)
    serializer_class = FormulaGlossarySerializer
    permission_classes = [IsAdminReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)

        # Filter by complexity
        complexity = self.request.query_params.get('complexity')
        if complexity:
            qs = qs.filter(complexity=complexity)

        # Search
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(abbreviation__icontains=search) |
                Q(definition__icontains=search) |
                Q(tags__contains=[search])
            )

        # Filter by tag
        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__contains=[tag])

        return qs

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all formula categories with counts"""
        categories = FormulaCategory.objects.annotate(
            formula_count=Count('formulas', filter=Q(formulas__is_active=True))
        ).all()
        serializer = FormulaCategoryDetailSerializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def tags(self, request):
        """Get all unique tags"""
        formulas = FormulaGlossary.objects.filter(is_active=True)
        tags = set()
        for formula in formulas:
            if formula.tags:
                tags.update(formula.tags)
        return Response(sorted(tags))

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        """Get related formulas"""
        formula = self.get_object()
        related = formula.get_related_formulas()[:10]
        serializer = FormulaGlossarySerializer(related, many=True)
        return Response(serializer.data)


class DashboardSummaryView(APIView):
    """Dashboard summary statistics"""
    permission_classes = [IsAdminReadOnly]

    def get(self, request):
        total_assumptions = DefaultAssumption.objects.filter(is_active=True).count()
        total_formulas = FormulaGlossary.objects.filter(is_active=True).count()
        recent_changes = AssumptionAuditLog.objects.count()
        locked_assumptions = DefaultAssumption.objects.filter(
            is_locked=True, is_active=True
        ).count()
        
        # Recent activity
        recent_logs = AssumptionAuditLog.objects.select_related(
            'assumption', 'changed_by'
        ).all()[:10]

        categories_summary = AssumptionCategory.objects.annotate(
            active_count=Count(
                'assumptions',
                filter=Q(assumptions__is_active=True)
            )
        ).values('name', 'slug', 'icon', 'active_count')

        formula_categories_summary = FormulaCategory.objects.annotate(
            active_count=Count(
                'formulas',
                filter=Q(formulas__is_active=True)
            )
        ).values('name', 'slug', 'icon', 'color', 'active_count')

        return Response({
            'stats': {
                'total_assumptions': total_assumptions,
                'total_formulas': total_formulas,
                'total_changes': recent_changes,
                'locked_assumptions': locked_assumptions,
            },
            'assumption_categories': list(categories_summary),
            'formula_categories': list(formula_categories_summary),
            'recent_activity': AuditLogSerializer(recent_logs, many=True).data,
            'user_is_superadmin': request.user.is_superuser,
        })
