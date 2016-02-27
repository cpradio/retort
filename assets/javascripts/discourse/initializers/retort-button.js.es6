import { withPluginApi } from 'discourse/lib/plugin-api';
import PostMenuComponent from 'discourse/components/post-menu';
import { Button } from 'discourse/components/post-menu';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';
import { showSelector } from "discourse/lib/emoji/emoji-toolbar";

function priorToApi(container)
{
  PostMenuComponent.registerButton(function(visibleButtons) {
    if (!Discourse.User.current() || !this.siteSettings.retort_enabled) { return }
    return visibleButtons.splice(0, 0, new Button('retort', 'retort.title', 'smile-o'))
  })

  PostMenuComponent.reopen({
    clickRetort: function(post) {
      const self = this
      showSelector({
        container: self.container,
        onSelect: function(retort) {
          Discourse.ajax('/retorts/' + self.get('post.id') + '.json', {
            type: 'POST',
            data: { retort: retort }
          })
          return false
        }
      })
    }
  })
}

function initializePlugin(api)
{
  api.includePostAttributes('retorts');

  api.decorateWidget('post-contents:after-cooked', dec => {
    const post = dec.getModel();
    if (post.retorts.length === 0) { return; }

    var html = '<div class="post-retorts">';

    var sortedRetorts = post.retorts.sortBy(['emoji']);
    var priorRetort = '';
    for (var i = 0; i < sortedRetorts.length; i++) {
      var item = sortedRetorts[i];
      var isFirstRetort = priorRetort === '';
      var isDifferentRetort = priorRetort !== item.emoji;

      if (isFirstRetort)
        html += '<div class="post-retort">';

      if (isDifferentRetort && !isFirstRetort) {
        html = html.substring(0, html.length - 2);
        html += '</span></div>';
        html += '<div class="post-retort">';
      }

      if (isFirstRetort || isDifferentRetort)
        html += `<img src="${Discourse.Emoji.urlFor(item.emoji)}" class="emoji" alt=":${item.emoji}:"><span class="post-retort-tooltip">`;

      html += `${item.username}, `;

      priorRetort = item.emoji;
    }

    html = html.substring(0, html.length - 2);
    html += '</span></div>';
    html += '</div>';

    return dec.rawHtml(html);
  })

  const siteSettings = api.container.lookup('site-settings:main');
  if (!api._currentUser || !siteSettings.retort_enabled) { return; }

  api.addPostMenuButton('retort', attrs => {
    return {
      action: 'clickRetort',
      icon: 'smile-o',
      title: 'retort.title',
      position: 'first'
    };
  });

  api.attachWidgetAction('post-menu', 'clickRetort', function() {
    const post = this.findAncestorModel();
    const self = this;
    showSelector({
      container: self.container,
      onSelect: function(retort) {
        Discourse.ajax('/retorts/' + post.id + '.json', {
          type: 'POST',
          data: { retort: retort }
        })

        var updatedRetorts = post.retorts;
        updatedRetorts.push({emoji: retort, post_id: post.id, topic_id: post.topic_id, username: self.currentUser.username});
        post.setProperties({
          retorts: updatedRetorts
        });
        self.scheduleRerender();
        return false
      }
    })
  });
}

export default {
  name: 'retort-button',
  initialize: function() {
    withPluginApi('0.1', api => initializePlugin(api), { noApi: () => priorToApi() });
  }
}
