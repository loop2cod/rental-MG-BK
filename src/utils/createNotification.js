import Notification from "../models/NotificationSchema.js";

const createNotification = (message, type) => {
  const notification = new Notification({
    message,
    type,
  });

  notification.save();
};

export default createNotification;
