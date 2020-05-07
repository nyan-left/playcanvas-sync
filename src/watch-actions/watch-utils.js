const fs = require('fs');
const CUtils = require('../utils/common-utils');
const PathUtils = require('../utils/path-utils');
const nsfw = require('nsfw');
const IsGoodEvent = require('./is-good-event');

const ACTION_TO_NAME = {};
ACTION_TO_NAME[nsfw.actions.CREATED] = 'CREATED';
ACTION_TO_NAME[nsfw.actions.MODIFIED] = 'MODIFIED';
ACTION_TO_NAME[nsfw.actions.RENAMED] = 'RENAMED';
ACTION_TO_NAME[nsfw.actions.DELETED] = 'DELETED';

const WatchUtils = {
  actionModified: async function (e, conf) {
    const fullPath = PathUtils.eventToFullPath(e);

    const assetId = CUtils.getAssetId(fullPath, conf);

    const url = `/assets/${assetId}`;

    const h = {
      branchId: conf.PLAYCANVAS_BRANCH_ID,
      file: fs.createReadStream(fullPath)
    };

    await conf.client.putForm(url, h);

    return assetId;
  },

  actionDeleted: async function (e, conf) {
    const fullPath = PathUtils.eventToFullPath(e);

    const assetId = CUtils.getAssetId(fullPath, conf);

    const remotePath = conf.store.idToPath[assetId];

    conf.store.handleDeletedAsset(assetId);

    const url = `/assets/${assetId}?branchId=${conf.PLAYCANVAS_BRANCH_ID}`;

    await conf.client.methodDelete(url);

    return remotePath;
  },

  reportWatchAction: function (assetId, tag, conf) {
    const remotePath = conf.store.idToPath[assetId];

    const s = `${tag} ${remotePath}`;

    CUtils.watchMsg(s);
  },

  verboseEvents: function (a, tag, conf) {
    if (conf.PLAYCANVAS_VERBOSE) {
      CUtils.watchMsg(tag);

      a = a.map(WatchUtils.cloneWithActionStr);

      console.log(a);
    }
  },

  cloneWithActionStr: function (h) {
    h = CUtils.shallowClone(h);

    h.action = ACTION_TO_NAME[h.action];

    return h;
  },

  filterEvents: function (a, conf) {
    WatchUtils.verboseEvents(a, 'ALL EVENTS:', conf);

    a = a.filter(h => new IsGoodEvent(h, conf).run());

    WatchUtils.verboseEvents(a, 'EVENTS AFTER BAD REMOVED:', conf);

    return a;
  }
};

module.exports = WatchUtils;