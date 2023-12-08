"use client";

import React, { useCallback, useState } from "react";
import useSWR from "swr";
import {
  Card,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
  Text,
} from "@tremor/react";
import {
  ChevronDown,
  ChevronsUpDownIcon,
  ExpandIcon,
  MailsIcon,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useLocalStorage } from "usehooks-ts";
import { LoadingContent } from "@/components/LoadingContent";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NewsletterStatsQuery,
  NewsletterStatsResponse,
} from "@/app/api/user/stats/newsletters/route";
import { useExpanded } from "@/app/(app)/stats/useExpanded";
import { Button } from "@/components/ui/button";
import { getDateRangeParams } from "@/app/(app)/stats/params";
import { NewsletterModal } from "@/app/(app)/stats/NewsletterModal";
import { Tooltip } from "@/components/Tooltip";
import {
  EmailsToIncludeFilter,
  useEmailsToIncludeFilter,
} from "@/app/(app)/stats/EmailsToIncludeFilter";
import { onAutoArchive } from "@/utils/actions-client";
import { Toggle } from "@/components/ui/toggle";

export function NewsletterStats(props: {
  dateRange?: DateRange | undefined;
  refreshInterval: number;
}) {
  const [sortColumn, setSortColumn] = useState<
    "emails" | "unread" | "unarchived"
  >("emails");
  const [includeFilteredEmails, setIncludeFilteredEmails] = useState(false);
  const toggleIncludeFilteredEmails = useCallback(
    () => setIncludeFilteredEmails((v) => !v),
    [],
  );

  const { typesArray, types, setTypes } = useEmailsToIncludeFilter();

  const params: NewsletterStatsQuery = {
    types: typesArray,
    orderBy: sortColumn,
    limit: 100,
    ...getDateRangeParams(props.dateRange),
    includeFilteredEmails,
  };

  const urlParams = new URLSearchParams(params as any);

  const { data, isLoading, error } = useSWR<
    NewsletterStatsResponse,
    { error: string }
  >(`/api/user/stats/newsletters?${urlParams}`, {
    refreshInterval: props.refreshInterval,
    keepPreviousData: true,
  });

  const { expanded, extra } = useExpanded();
  const [selectedNewsletter, setSelectedNewsletter] =
    React.useState<NewsletterStatsResponse["newsletters"][number]>();

  // won't work if user switches devices
  const [unsubscribedEmails, setUnsubscribedEmails] = useLocalStorage<{
    [key: string]: boolean;
  }>("unsubscribedEmails", {});

  return (
    <>
      <Card className="p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="">
            <Title>
              Which newsletters and marketing emails do you get the most?
            </Title>
            <Text className="mt-2">
              A list of are your email subscriptions. Quickly unsubscribe or
              view the emails in more detail.
            </Text>
          </div>
          <div className="flex space-x-2">
            <Toggle
              aria-label="Toggle Auto Archived Emails"
              onClick={toggleIncludeFilteredEmails}
            >
              <Tooltip content="Toggle Auto Archived Emails">
                <MailsIcon className="h-4 w-4" />
              </Tooltip>
            </Toggle>

            <EmailsToIncludeFilter types={types} setTypes={setTypes} />
          </div>
        </div>

        <LoadingContent
          loading={!data && isLoading}
          error={error}
          loadingComponent={<Skeleton className="m-4 h-screen rounded" />}
        >
          {data && (
            <Table className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="pl-6">
                    <span className="text-sm font-medium">From</span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <HeaderButton
                      sorted={sortColumn === "emails"}
                      onClick={() => setSortColumn("emails")}
                    >
                      Emails
                    </HeaderButton>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <HeaderButton
                      sorted={sortColumn === "unread"}
                      onClick={() => setSortColumn("unread")}
                    >
                      Read
                    </HeaderButton>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <HeaderButton
                      sorted={sortColumn === "unarchived"}
                      onClick={() => setSortColumn("unarchived")}
                    >
                      Archived
                    </HeaderButton>
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden xl:table-cell"></TableHeaderCell>
                  <TableHeaderCell className="hidden xl:table-cell"></TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.newsletters
                  .slice(0, expanded ? undefined : 50)
                  .map((item) => {
                    const readPercentage = (item.readEmails / item.value) * 100;
                    const archivedEmails = item.value - item.inboxEmails;
                    const archivedPercentage =
                      (archivedEmails / item.value) * 100;

                    return (
                      <TableRow key={item.name}>
                        <TableCell className="max-w-[200px] truncate pl-6 lg:max-w-[300px] 2xl:max-w-none">
                          {item.name}
                        </TableCell>
                        <TableCell>{item.value}</TableCell>
                        <TableCell>
                          <ProgressBar
                            label={`${Math.round(readPercentage)}%`}
                            value={readPercentage}
                            tooltip={`${item.readEmails} read. ${
                              item.value - item.readEmails
                            } unread.`}
                            color="blue"
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <ProgressBar
                            label={`${Math.round(archivedPercentage)}%`}
                            value={archivedPercentage}
                            tooltip={`${archivedEmails} archived. ${item.inboxEmails} unarchived.`}
                            color="blue"
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Button
                            size="sm"
                            variant={
                              unsubscribedEmails[item.name]
                                ? "ghost"
                                : "secondary"
                            }
                            disabled={!item.lastUnsubscribeLink}
                            asChild={!!item.lastUnsubscribeLink}
                          >
                            <a
                              href={item.lastUnsubscribeLink}
                              target="_blank"
                              onClick={() => {
                                setUnsubscribedEmails((u) => ({
                                  ...u,
                                  [item.name]: true,
                                }));
                              }}
                            >
                              {unsubscribedEmails[item.name]
                                ? "Unsubscribed"
                                : "Unsubscribe"}
                            </a>
                          </Button>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Tooltip content="Auto archive emails using Gmail filters">
                            <Button
                              size="sm"
                              variant={
                                item.autoArchived ? "ghost" : "secondary"
                              }
                              onClick={() => onAutoArchive(item.name)}
                            >
                              {item.autoArchived
                                ? "Auto archived"
                                : "Auto archive"}
                            </Button>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedNewsletter(item)}
                          >
                            <ExpandIcon className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
          <div className="mt-2 px-6 pb-6">{extra}</div>
        </LoadingContent>
      </Card>
      <NewsletterModal
        newsletter={selectedNewsletter}
        onClose={() => setSelectedNewsletter(undefined)}
        refreshInterval={props.refreshInterval}
      />
    </>
  );
}

function HeaderButton(props: {
  children: React.ReactNode;
  sorted: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={props.onClick}
    >
      <span>{props.children}</span>
      {props.sorted ? (
        <ChevronDown className="ml-2 h-4 w-4" />
      ) : (
        <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
