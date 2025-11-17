import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

interface TrackEventOptions {
  category: 'banner' | 'onboarding' | 'feature' | 'navigation' | 'export';
  metadata?: Record<string, any>;
}

export function useAnalytics() {
  const { user } = useAuth();
  const sessionId = useRef(getOrCreateSessionId());

  useEffect(() => {
    if (user) {
      supabase.from('analytics_user_sessions').insert({
        user_id: user.id,
        session_id: sessionId.current,
      }).then(() => {
        console.log('[Analytics] Session started');
      });
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (user) {
        supabase.from('analytics_user_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('session_id', sessionId.current)
          .then(() => console.log('[Analytics] Session ended'));
      }
    };
  }, [user]);

  const trackEvent = async (eventName: string, options: TrackEventOptions) => {
    try {
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        event_name: eventName,
        event_category: options.category,
        event_metadata: options.metadata || {},
        page_path: window.location.pathname,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('[Analytics] Error:', error);
    }
  };

  const trackPageView = async (pagePath: string) => {
    await trackEvent('page_view', {
      category: 'navigation',
      metadata: { path: pagePath },
    });
  };

  const trackFeatureUsage = async (featureName: string) => {
    if (!user) return;
    
    try {
      await supabase.rpc('increment_feature_usage', {
        _user_id: user.id,
        _feature_name: featureName,
      });
      
      await trackEvent('feature_used', {
        category: 'feature',
        metadata: { feature: featureName },
      });
    } catch (error) {
      console.error('[Analytics] Feature tracking error:', error);
    }
  };

  const trackBannerClick = async (actionType: 'login' | 'invite') => {
    await trackEvent('banner_click', {
      category: 'banner',
      metadata: { action: actionType },
    });
  };

  const trackOnboardingStep = async (stepNumber: number, stepName: string, action: 'view' | 'complete' | 'skip') => {
    await trackEvent('onboarding_step', {
      category: 'onboarding',
      metadata: { step: stepNumber, name: stepName, action },
    });
  };

  return {
    trackEvent,
    trackPageView,
    trackFeatureUsage,
    trackBannerClick,
    trackOnboardingStep,
  };
}
